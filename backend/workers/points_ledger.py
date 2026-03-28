#!/usr/bin/env python3
"""
AtmosNet Points Ledger

Processes validated observations and awards AtmosPoints.
"""

import asyncio
import json
import os
import sys
from datetime import datetime, date, timedelta
from typing import Dict, Any
import logging

from aiokafka import AIOKafkaConsumer
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal
from app.models import Account, Transaction, ValidatedObservation
from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("points-ledger")


class PointsLedger:
    """Manages AtmosPoints awards and redemptions."""
    
    def __init__(self):
        self.consumer = None
    
    async def start(self):
        """Start the points ledger processor."""
        logger.info("Starting Points Ledger...")
        
        self.consumer = AIOKafkaConsumer(
            settings.KAFKA_VALIDATED_TOPIC,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id="points-ledger",
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest'
        )
        
        await self.consumer.start()
        
        logger.info("Points Ledger started. Waiting for validated observations...")
        
        try:
            async for msg in self.consumer:
                await self.process_validated_observation(msg.value)
        finally:
            await self.stop()
    
    async def stop(self):
        """Stop the points ledger."""
        logger.info("Stopping Points Ledger...")
        await self.consumer.stop()
    
    async def process_validated_observation(self, data: Dict[str, Any]):
        """Process a validated observation and award points."""
        device_id_hash = data.get("device_id_hash")
        tier = data.get("tier")
        observation_id = data.get("observation_id")
        
        if not tier or tier not in ["A", "B"]:
            return
        
        async with AsyncSessionLocal() as session:
            # Get or create account
            account = await self.get_or_create_account(session, device_id_hash)
            
            # Calculate points for this observation
            points = settings.POINTS_TIER_A if tier == "A" else settings.POINTS_TIER_B
            
            # Award points
            account.balance += points
            account.total_earned += points
            
            # Create transaction
            transaction = Transaction(
                account_id=account.id,
                amount=points,
                type=f"observation_tier_{tier.lower()}",
                description=f"Tier {tier} observation validated",
                observation_id=observation_id
            )
            session.add(transaction)
            
            # Update streak and check for daily bonus
            await self.update_streak_and_bonus(session, account)
            
            await session.commit()
            
            logger.info(f"Awarded {points} points to {device_id_hash} for Tier {tier} observation")
    
    async def get_or_create_account(self, session: AsyncSession, device_id_hash: str) -> Account:
        """Get existing account or create new one."""
        result = await session.execute(
            select(Account).where(Account.device_id_hash == device_id_hash)
        )
        account = result.scalar_one_or_none()
        
        if not account:
            account = Account(
                device_id_hash=device_id_hash,
                balance=0,
                total_earned=0,
                total_redeemed=0,
                current_streak=0,
                contributions_today=0
            )
            session.add(account)
            await session.flush()  # Get the ID
        
        return account
    
    async def update_streak_and_bonus(self, session: AsyncSession, account: Account):
        """Update streak and check for daily bonus."""
        today = date.today()
        
        # Check if this is a new day
        if account.last_contribution_date:
            last_date = account.last_contribution_date.date()
            
            if last_date == today:
                # Same day - increment today's count
                account.contributions_today += 1
            elif last_date == today - timedelta(days=1):
                # Consecutive day - maintain streak
                account.current_streak += 1
                account.contributions_today = 1
            else:
                # Streak broken
                account.current_streak = 1
                account.contributions_today = 1
        else:
            # First contribution ever
            account.current_streak = 1
            account.contributions_today = 1
        
        account.last_contribution_date = datetime.utcnow()
        
        # Check for daily bonus
        if account.contributions_today == settings.POINTS_DAILY_BONUS_THRESHOLD:
            # Award daily bonus
            bonus = settings.POINTS_DAILY_BONUS
            account.balance += bonus
            account.total_earned += bonus
            
            bonus_transaction = Transaction(
                account_id=account.id,
                amount=bonus,
                type="daily_bonus",
                description=f"Daily bonus for {settings.POINTS_DAILY_BONUS_THRESHOLD}+ contributions"
            )
            session.add(bonus_transaction)
            
            logger.info(f"Awarded daily bonus of {bonus} points to {account.device_id_hash}")


async def main():
    """Main entry point."""
    ledger = PointsLedger()
    
    try:
        await ledger.start()
    except KeyboardInterrupt:
        logger.info("Received shutdown signal")
    finally:
        await ledger.stop()


if __name__ == "__main__":
    asyncio.run(main())
