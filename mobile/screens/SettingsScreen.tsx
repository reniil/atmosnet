import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../store/authStore';
import { useSensorsStore } from '../store/sensorsStore';

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  destructive?: boolean;
}

function SettingItem({ icon, title, subtitle, value, onPress, onToggle, destructive }: SettingItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && !onToggle}
    >
      <View style={[styles.settingIcon, destructive && styles.settingIconDestructive]}>
        <Ionicons name={icon} size={20} color={destructive ? '#ef4444' : '#6b7280'} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, destructive && styles.settingTitleDestructive]}>
          {title}
        </Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {onToggle && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#e5e7eb', true: '#2563eb' }}
        />
      )}
      {onPress && !onToggle && (
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { hasOptedIn, updateOptIn } = useAuthStore();
  const { isCollecting, startCollection, stopCollection } = useSensorsStore();

  const handleToggleCollection = async (value: boolean) => {
    if (value) {
      await startCollection();
    } else {
      await stopCollection();
    }
  };

  const handleToggleOptIn = async (value: boolean) => {
    Alert.alert(
      value ? 'Enable Data Collection?' : 'Disable Data Collection?',
      value
        ? 'Your device will contribute anonymized weather data to the network.'
        : 'You will stop earning AtmosPoints and contributing to the network.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: value ? 'Enable' : 'Disable',
          onPress: async () => {
            await updateOptIn(value);
            if (!value) {
              await stopCollection();
            }
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Data',
      'This will export all your observations and account data.\n\nNote: This feature requires 200 AtmosPoints.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Export', onPress: () => console.log('Export data') },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account?',
      'This will permanently delete your account and all associated data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => console.log('Delete account'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Data Collection Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Collection</Text>
          <SettingItem
            icon="cloud-upload-outline"
            title="Contribute Data"
            subtitle="Submit weather observations to the network"
            value={hasOptedIn}
            onToggle={handleToggleOptIn}
          />
          <SettingItem
            icon="radio-button-on-outline"
            title="Active Collection"
            subtitle="Background sensor polling is enabled"
            value={isCollecting}
            onToggle={handleToggleCollection}
          />
          <SettingItem
            icon="wifi-outline"
            title="WiFi Only Upload"
            subtitle="Upload observations only on WiFi"
            value={true}
            onToggle={() => {}}
          />
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <SettingItem
            icon="document-text-outline"
            title="Privacy Policy"
            onPress={() => {}}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            title="Data We Collect"
            subtitle="View what data is collected and how it's used"
            onPress={() => {}}
          />
          <SettingItem
            icon="download-outline"
            title="Export My Data"
            subtitle="Download a copy of your data"
            onPress={handleExportData}
          />
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <SettingItem
            icon="information-circle-outline"
            title="About AtmosNet"
            onPress={() => {}}
          />
          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
            onPress={() => {}}
          />
          <SettingItem
            icon="star-outline"
            title="Rate the App"
            onPress={() => {}}
          />
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <SettingItem
            icon="trash-outline"
            title="Delete Account"
            subtitle="Permanently delete your account and data"
            destructive
            onPress={handleDeleteAccount}
          />
        </View>

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>AtmosNet v1.0.0</Text>
          <Text style={styles.versionBuild}>Build 20240325</Text>
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
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  section: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingIconDestructive: {
    backgroundColor: '#fef2f2',
  },
  settingContent: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    color: '#1f2937',
  },
  settingTitleDestructive: {
    color: '#ef4444',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  versionContainer: {
    padding: 24,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  versionBuild: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
});
