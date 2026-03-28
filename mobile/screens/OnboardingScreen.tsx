import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../store/authStore';
import { requestLocationPermissions, isBarometerAvailable } from '../utils/sensors';

const STEPS = [
  {
    title: 'Welcome to AtmosNet',
    description: 'Join a global network of weather sensors. Your device helps create hyperlocal weather forecasts.',
    icon: 'cloud-outline',
  },
  {
    title: 'What We Collect',
    description: '• Barometric pressure\n• GPS location (rounded to 500m)\n• Motion data (to optimize collection)\n\nYour exact location is never shared.',
    icon: 'lock-closed-outline',
  },
  {
    title: 'Privacy First',
    description: '• GPS is rounded before leaving your device\n• Device ID is hashed\n• No personal data stored\n• You control your data',
    icon: 'shield-checkmark-outline',
  },
  {
    title: 'Earn Rewards',
    description: 'Get AtmosPoints for accurate observations:\n• Tier A: 10 points\n• Tier B: 4 points\n• Daily bonus: 20 points',
    icon: 'gift-outline',
  },
];

export default function OnboardingScreen() {
  const { completeOnboarding } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [optIn, setOptIn] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Request permissions on last step
      const hasLocation = await requestLocationPermissions();
      const hasBarometer = await isBarometerAvailable();
      
      if (!hasLocation) {
        alert('Location permission is required for weather collection.');
        return;
      }
      
      if (!hasBarometer) {
        alert('Your device does not have a barometer. You can still use the app to view weather data.');
      }
      
      await completeOnboarding(optIn);
    }
  };

  const step = STEPS[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress indicator */}
        <View style={styles.progressContainer}>
          {STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                index === currentStep && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        {/* Step content */}
        <View style={styles.content}>
          <Ionicons
            name={step.icon as any}
            size={80}
            color="#2563eb"
            style={styles.icon}
          />
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.description}>{step.description}</Text>
        </View>

        {/* Opt-in toggle on last step */}
        {currentStep === STEPS.length - 1 && (
          <View style={styles.optInContainer}>
            <Text style={styles.optInText}>
              I consent to contributing anonymized weather data
            </Text>
            <Switch
              value={optIn}
              onValueChange={setOptIn}
              trackColor={{ false: '#ccc', true: '#2563eb' }}
            />
          </View>
        )}

        {/* Navigation */}
        <View style={styles.footer}>
          {currentStep > 0 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>
              {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Ionicons
              name="arrow-forward"
              size={20}
              color="#fff"
              style={styles.nextIcon}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  progressDotActive: {
    backgroundColor: '#2563eb',
    width: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#1f2937',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 24,
  },
  optInContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    marginVertical: 24,
  },
  optInText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginRight: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 24,
  },
  backButton: {
    padding: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextIcon: {
    marginLeft: 8,
  },
});
