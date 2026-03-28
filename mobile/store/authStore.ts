import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'atmosnet_onboarding_complete';
const OPT_IN_KEY = 'atmosnet_data_opt_in';

interface AuthState {
  hasCompletedOnboarding: boolean;
  hasOptedIn: boolean;
  isLoading: boolean;
  
  // Actions
  checkOnboarding: () => Promise<void>;
  completeOnboarding: (optIn: boolean) => Promise<void>;
  updateOptIn: (optIn: boolean) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hasCompletedOnboarding: false,
  hasOptedIn: false,
  isLoading: true,
  
  checkOnboarding: async () => {
    try {
      const completed = await SecureStore.getItemAsync(ONBOARDING_KEY);
      const optedIn = await SecureStore.getItemAsync(OPT_IN_KEY);
      
      set({
        hasCompletedOnboarding: completed === 'true',
        hasOptedIn: optedIn === 'true',
        isLoading: false,
      });
    } catch (error) {
      console.error('Error checking onboarding:', error);
      set({ isLoading: false });
    }
  },
  
  completeOnboarding: async (optIn: boolean) => {
    try {
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
      await SecureStore.setItemAsync(OPT_IN_KEY, optIn ? 'true' : 'false');
      
      set({
        hasCompletedOnboarding: true,
        hasOptedIn: optIn,
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  },
  
  updateOptIn: async (optIn: boolean) => {
    try {
      await SecureStore.setItemAsync(OPT_IN_KEY, optIn ? 'true' : 'false');
      set({ hasOptedIn: optIn });
    } catch (error) {
      console.error('Error updating opt-in:', error);
    }
  },
}));
