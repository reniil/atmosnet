import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { getDeviceIdHash } from '../utils/crypto';
import { getPointsBalance, getTransactionHistory, redeemPoints } from '../services/api';
import { PointsBalance, Transaction } from '../types';

const REWARD_OPTIONS = [
  {
    id: 'premium_maps',
    name: 'Premium Map Features',
    description: 'Unlock detailed weather maps and historical data',
    cost: 500,
    icon: 'map-outline',
  },
  {
    id: 'export_data',
    name: 'Export Your Data',
    description: 'Download all your observations as CSV',
    cost: 200,
    icon: 'download-outline',
  },
  {
    id: 'early_access',
    name: 'Beta Access',
    description: 'Get early access to new features',
    cost: 1000,
    icon: 'flask-outline',
  },
];

export default function RewardsScreen() {
  const [deviceIdHash, setDeviceIdHash] = useState('');
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const hash = await getDeviceIdHash();
    setDeviceIdHash(hash);
    
    try {
      const [balanceData, historyData] = await Promise.all([
        getPointsBalance(hash),
        getTransactionHistory(hash, 20),
      ]);
      setBalance(balanceData);
      setTransactions(historyData);
    } catch (error) {
      console.error('Failed to load rewards data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRedeem = async (reward: typeof REWARD_OPTIONS[0]) => {
    if (!balance || balance.balance < reward.cost) {
      alert(`You need ${reward.cost - (balance?.balance || 0)} more points`);
      return;
    }

    try {
      await redeemPoints(deviceIdHash, reward.cost, reward.id);
      alert(`Successfully redeemed ${reward.name}!`);
      loadData();
    } catch (error) {
      alert('Failed to redeem. Please try again.');
    }
  };

  const getTransactionIcon = (type: string) => {
    if (type.includes('tier_a')) return 'star';
    if (type.includes('tier_b')) return 'star-half';
    if (type.includes('daily_bonus')) return 'flame';
    if (type.includes('redemption')) return 'gift';
    return 'wallet';
  };

  const getTransactionColor = (amount: number) => {
    return amount > 0 ? '#10b981' : '#ef4444';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />
        }
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Points</Text>
          <Text style={styles.balanceValue}>{balance?.balance.toLocaleString() || '0'}</Text>
          <View style={styles.balanceStats}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>{balance?.total_earned.toLocaleString() || '0'}</Text>
              <Text style={styles.balanceStatLabel}>Earned</Text>
            </View>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatValue}>{balance?.total_redeemed.toLocaleString() || '0'}</Text>
              <Text style={styles.balanceStatLabel}>Redeemed</Text>
            </View>
          </View>
        </View>

        {/* Reward Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Redeem Points</Text>
          {REWARD_OPTIONS.map((reward) => (
            <TouchableOpacity
              key={reward.id}
              style={[
                styles.rewardCard,
                balance && balance.balance >= reward.cost && styles.rewardCardActive,
              ]}
              onPress={() => handleRedeem(reward)}
              disabled={!balance || balance.balance < reward.cost}
            >
              <View style={styles.rewardIcon}>
                <Ionicons
                  name={reward.icon as any}
                  size={24}
                  color={balance && balance.balance >= reward.cost ? '#2563eb' : '#9ca3af'}
                />
              </View>
              <View style={styles.rewardContent}>
                <Text style={styles.rewardName}>{reward.name}</Text>
                <Text style={styles.rewardDescription}>{reward.description}</Text>
              </View>
              <View style={styles.rewardCost}>
                <Text style={[
                  styles.rewardCostValue,
                  balance && balance.balance >= reward.cost && styles.rewardCostValueActive,
                ]}>
                  {reward.cost}
                </Text>
                <Text style={styles.rewardCostLabel}>pts</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>No transactions yet</Text>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.transaction}>
                <View style={styles.transactionIcon}>
                  <Ionicons
                    name={getTransactionIcon(tx.type) as any}
                    size={20}
                    color={getTransactionColor(tx.amount)}
                  />
                </View>
                <View style={styles.transactionContent}>
                  <Text style={styles.transactionType}>
                    {tx.description || tx.type}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: getTransactionColor(tx.amount) },
                ]}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#2563eb',
    borderRadius: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  balanceStats: {
    flexDirection: 'row',
    gap: 24,
  },
  balanceStat: {
    flex: 1,
  },
  balanceStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  balanceStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    opacity: 0.6,
  },
  rewardCardActive: {
    opacity: 1,
    borderColor: '#2563eb',
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardContent: {
    flex: 1,
    marginLeft: 12,
  },
  rewardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  rewardDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  rewardCost: {
    alignItems: 'center',
  },
  rewardCostValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  rewardCostValueActive: {
    color: '#2563eb',
  },
  rewardCostLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    padding: 24,
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionContent: {
    flex: 1,
    marginLeft: 12,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
});
