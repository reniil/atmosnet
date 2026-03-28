from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date

from app.database import get_db
from app.models import Account, Transaction, Redemption
from app.schemas import PointsBalanceResponse, RedemptionCreate, RedemptionResponse

router = APIRouter()


@router.get("/balance/{device_id_hash}", response_model=PointsBalanceResponse)
async def get_balance(device_id_hash: str, db: AsyncSession = Depends(get_db)):
    """Get AtmosPoints balance for a device."""
    result = await db.execute(
        select(Account).where(Account.device_id_hash == device_id_hash)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        # Return empty account if doesn't exist yet
        return PointsBalanceResponse(
            device_id_hash=device_id_hash,
            balance=0,
            total_earned=0,
            total_redeemed=0,
            current_streak=0,
            contributions_today=0
        )
    
    return PointsBalanceResponse(
        device_id_hash=account.device_id_hash,
        balance=account.balance,
        total_earned=account.total_earned,
        total_redeemed=account.total_redeemed,
        current_streak=account.current_streak,
        contributions_today=account.contributions_today
    )


@router.post("/redeem", response_model=RedemptionResponse, status_code=status.HTTP_201_CREATED)
async def create_redemption(
    redemption: RedemptionCreate,
    db: AsyncSession = Depends(get_db)
):
    """Redeem AtmosPoints for a reward."""
    # Get account
    result = await db.execute(
        select(Account).where(Account.device_id_hash == redemption.device_id_hash)
    )
    account = result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Check balance
    if account.balance < redemption.points_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Have {account.balance}, need {redemption.points_amount}"
        )
    
    # Create redemption
    db_redemption = Redemption(
        account_id=account.id,
        points_spent=redemption.points_amount,
        reward_type=redemption.reward_type,
        reward_details=redemption.reward_details
    )
    
    # Deduct points
    account.balance -= redemption.points_amount
    account.total_redeemed += redemption.points_amount
    
    # Create transaction record
    transaction = Transaction(
        account_id=account.id,
        amount=-redemption.points_amount,
        type="redemption",
        description=f"Redeemed for {redemption.reward_type}"
    )
    
    db.add(db_redemption)
    db.add(transaction)
    await db.commit()
    await db.refresh(db_redemption)
    
    return db_redemption


@router.get("/{device_id_hash}/history")
async def get_transaction_history(
    device_id_hash: str,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Get transaction history for an account."""
    # Get account first
    account_result = await db.execute(
        select(Account).where(Account.device_id_hash == device_id_hash)
    )
    account = account_result.scalar_one_or_none()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Get transactions
    result = await db.execute(
        select(Transaction)
        .where(Transaction.account_id == account.id)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    transactions = result.scalars().all()
    
    return [
        {
            "id": str(t.id),
            "amount": t.amount,
            "type": t.type,
            "description": t.description,
            "created_at": t.created_at
        }
        for t in transactions
    ]
