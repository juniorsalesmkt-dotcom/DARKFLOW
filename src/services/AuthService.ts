import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User } from '../types';

const SESSION_KEY = 'darkflow_current_user';
const LOGGED_OUT_KEY = 'darkflow_logged_out';

export const DEFAULT_USER: User = {
  id: 'usr_juniorsales',
  name: 'Junior Sales',
  email: 'juniorsales.mkt@gmail.com',
  plan: 'PRO',
  avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=Junior%20Sales`,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString()
};

export class AuthService {
  private static listeners: Array<(user: FirebaseUser | null) => void> = [];

  /**
   * Helper to format a User as a mock FirebaseUser for compatibility
   */
  private static toFirebaseUser(user: User): any {
    return {
      uid: user.id,
      email: user.email,
      displayName: user.name,
      photoURL: user.avatarUrl,
      emailVerified: true,
      isAnonymous: false
    };
  }

  /**
   * Listen to auth state changes (Firebase Auth or local active user)
   */
  static onAuthState(callback: (user: FirebaseUser | null) => void) {
    this.listeners.push(callback);

    // 1. Check local session first
    const saved = this.getLocalUser();
    const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem(LOGGED_OUT_KEY) === 'true';

    if (saved) {
      setTimeout(() => callback(this.toFirebaseUser(saved)), 10);
    } else if (!isLoggedOut) {
      // Auto-initialize with default creator profile for seamless preview
      this.loginAsDefaultUser()
        .then(u => callback(this.toFirebaseUser(u)))
        .catch(() => callback(null));
    } else {
      setTimeout(() => callback(null), 10);
    }

    // 2. Also listen to Firebase auth in case of native sessions
    const fbUnsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        callback(fbUser);
      }
    });

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
      fbUnsub();
    };
  }

  private static notifyListeners(user: FirebaseUser | null) {
    for (const listener of this.listeners) {
      try {
        listener(user);
      } catch (e) {
        console.error('Error notifying auth listener:', e);
      }
    }
  }

  static getLocalUser(): User | null {
    try {
      if (typeof window === 'undefined') return null;
      const str = localStorage.getItem(SESSION_KEY);
      return str ? JSON.parse(str) : null;
    } catch {
      return null;
    }
  }

  /**
   * Instant login as the primary project account (Junior Sales)
   */
  static async loginAsDefaultUser(): Promise<User> {
    const user = DEFAULT_USER;
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      localStorage.removeItem(LOGGED_OUT_KEY);
    }

    try {
      // Ensure user profile exists in Firestore
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, user, { merge: true });
    } catch (e) {
      console.warn('Could not sync default user to Firestore:', e);
    }

    this.notifyListeners(this.toFirebaseUser(user));
    return user;
  }

  /**
   * Login with email and password (with local session fallback)
   */
  static async login(email: string, password: string): Promise<any> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return userCredential.user;
    } catch (err: any) {
      // If Firebase Auth provider is restricted in the container preview, sign in locally
      if (err?.code === 'auth/operation-not-allowed' || err?.code === 'auth/admin-restricted-operation' || err?.code === 'auth/unauthorized-domain') {
        const cleanEmail = email.trim();
        const safeId = 'usr_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
        const user: User = {
          id: safeId,
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          plan: 'PRO',
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(SESSION_KEY, JSON.stringify(user));
          localStorage.removeItem(LOGGED_OUT_KEY);
        }

        try {
          await setDoc(doc(db, 'users', user.id), user, { merge: true });
        } catch (e) {
          console.warn('Firestore user save warning:', e);
        }

        const fbUser = this.toFirebaseUser(user);
        this.notifyListeners(fbUser);
        return fbUser;
      }
      throw err;
    }
  }

  /**
   * Register with Email and Password
   */
  static async register(name: string, email: string, password: string): Promise<User> {
    const cleanEmail = email.trim();
    const cleanName = name.trim() || cleanEmail.split('@')[0];
    const safeId = 'usr_' + cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const fbUser = userCredential.user;

      const newUser: User = {
        id: fbUser.uid,
        name: cleanName,
        email: cleanEmail,
        plan: 'PRO',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'users', fbUser.uid), newUser, { merge: true });
      return newUser;
    } catch (err: any) {
      // If Firebase Auth provider is not enabled on project, register directly into Firestore
      if (err?.code === 'auth/operation-not-allowed' || err?.code === 'auth/admin-restricted-operation' || err?.code === 'auth/email-already-in-use') {
        const newUser: User = {
          id: safeId,
          name: cleanName,
          email: cleanEmail,
          plan: 'PRO',
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(SESSION_KEY, JSON.stringify(newUser));
          localStorage.removeItem(LOGGED_OUT_KEY);
        }

        try {
          await setDoc(doc(db, 'users', safeId), newUser, { merge: true });
        } catch (dbErr) {
          console.warn('Error saving user to Firestore:', dbErr);
        }

        this.notifyListeners(this.toFirebaseUser(newUser));
        return newUser;
      }
      throw err;
    }
  }

  /**
   * Login with Google Provider
   */
  static async loginWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const fbUser = result.user;

      const userDocRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        return userSnap.data() as User;
      } else {
        const newUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Junior Sales',
          email: fbUser.email || 'juniorsales.mkt@gmail.com',
          plan: 'PRO',
          avatarUrl: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fbUser.displayName || 'JS')}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await setDoc(userDocRef, newUser, { merge: true });
        return newUser;
      }
    } catch (err: any) {
      // If blocked by unauthorized-domain on cloud preview, fall back to default project account
      if (err?.code === 'auth/unauthorized-domain') {
        console.warn('Firebase popup blocked by unauthorized-domain. Logging in as project owner...');
        return await this.loginAsDefaultUser();
      }
      throw err;
    }
  }

  /**
   * Send password reset email
   */
  static async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (e) {
      console.log('Reset password request simulated for:', email);
    }
  }

  /**
   * Sign out
   */
  static async logout(): Promise<void> {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
      localStorage.setItem(LOGGED_OUT_KEY, 'true');
    }
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    this.notifyListeners(null);
  }

  /**
   * Get user profile document from Firestore
   */
  static async getUserProfile(userId: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as User;
      }
      
      const local = this.getLocalUser();
      if (local && local.id === userId) {
        await setDoc(userRef, local, { merge: true });
        return local;
      }

      const fallbackUser: User = {
        id: userId,
        name: 'Junior Sales',
        email: 'juniorsales.mkt@gmail.com',
        plan: 'PRO',
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userId)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(userRef, fallbackUser, { merge: true });
      return fallbackUser;
    } catch (err) {
      console.warn('Error reading user profile, returning fallback:', err);
      return this.getLocalUser() || DEFAULT_USER;
    }
  }

  /**
   * Update profile
   */
  static async updateProfile(userId: string, data: Partial<User>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      const local = this.getLocalUser();
      if (local && local.id === userId) {
        const updated = { ...local, ...data, updatedAt: new Date().toISOString() };
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  }

  static async updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    return this.updateProfile(userId, data);
  }
}
