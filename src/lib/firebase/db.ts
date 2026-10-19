import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { getFirebaseFirestore } from "./config";
import type {
  Profile,
  Account,
  Transaction,
  Budget,
  Goal,
  RecurringTransaction,
  Notification,
} from "../types";

/**
 * FYZA FIREBASE FIRESTORE DATA ACCESS LAYER
 * Handles persistent cloud storage for all user accounts, transactions,
 * recurring schedules, budgets, and financial goals with minor-unit integer precision.
 */

// ----------------------------------------------------
// Profiles
// ----------------------------------------------------
export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  const db = getFirebaseFirestore();
  if (!db) return null;
  try {
    const docRef = doc(db, "profiles", userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Profile;
    }
    return null;
  } catch (err) {
    console.warn("Firestore fetchUserProfile:", (err as Error)?.message || err);
    return null;
  }
}

export async function upsertUserProfile(profile: Profile): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;
  try {
    const docRef = doc(db, "profiles", profile.id);
    await setDoc(docRef, { ...profile, updated_at: new Date().toISOString() }, { merge: true });
    return true;
  } catch (err) {
    console.warn("Firestore upsertUserProfile:", (err as Error)?.message || err);
    return false;
  }
}

// ----------------------------------------------------
// Accounts
// ----------------------------------------------------
export async function fetchAccounts(userId: string): Promise<Account[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  try {
    const q = query(
      collection(db, "accounts"),
      where("user_id", "==", userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Account);
  } catch (err) {
    console.error("fetchAccounts error:", err);
    return [];
  }
}

export async function saveAccount(account: Account): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;
  try {
    const docRef = doc(db, "accounts", account.id);
    await setDoc(docRef, account, { merge: true });
    return true;
  } catch (err) {
    console.error("saveAccount error:", err);
    return false;
  }
}

export async function removeAccount(accountId: string): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "accounts", accountId));
    return true;
  } catch (err) {
    console.error("removeAccount error:", err);
    return false;
  }
}

// ----------------------------------------------------
// Transactions
// ----------------------------------------------------
export async function fetchTransactions(userId: string): Promise<Transaction[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  try {
    const q = query(
      collection(db, "transactions"),
      where("user_id", "==", userId),
      orderBy("transaction_date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Transaction);
  } catch (err) {
    console.error("fetchTransactions error:", err);
    return [];
  }
}

export async function saveTransaction(tx: Transaction): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;
  try {
    const docRef = doc(db, "transactions", tx.id);
    await setDoc(docRef, tx, { merge: true });
    return true;
  } catch (err) {
    console.error("saveTransaction error:", err);
    return false;
  }
}

export async function removeTransaction(txId: string): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "transactions", txId));
    return true;
  } catch (err) {
    console.error("removeTransaction error:", err);
    return false;
  }
}

// ----------------------------------------------------
// Recurring Transactions
// ----------------------------------------------------
export async function fetchRecurringTransactions(userId: string): Promise<RecurringTransaction[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  try {
    const q = query(
      collection(db, "recurring_transactions"),
      where("user_id", "==", userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as RecurringTransaction);
  } catch (err) {
    console.error("fetchRecurringTransactions error:", err);
    return [];
  }
}

export async function saveRecurringTransaction(rt: RecurringTransaction): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;
  try {
    const docRef = doc(db, "recurring_transactions", rt.id);
    await setDoc(docRef, rt, { merge: true });
    return true;
  } catch (err) {
    console.error("saveRecurringTransaction error:", err);
    return false;
  }
}

// ----------------------------------------------------
// Budgets
// ----------------------------------------------------
export async function fetchBudgets(userId: string): Promise<Budget[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  try {
    const q = query(
      collection(db, "budgets"),
      where("user_id", "==", userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Budget);
  } catch (err) {
    console.error("fetchBudgets error:", err);
    return [];
  }
}

export async function saveBudget(budget: Budget): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;
  try {
    const docRef = doc(db, "budgets", budget.id);
    await setDoc(docRef, budget, { merge: true });
    return true;
  } catch (err) {
    console.error("saveBudget error:", err);
    return false;
  }
}

// ----------------------------------------------------
// Goals
// ----------------------------------------------------
export async function fetchGoals(userId: string): Promise<Goal[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  try {
    const q = query(
      collection(db, "goals"),
      where("user_id", "==", userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Goal);
  } catch (err) {
    console.error("fetchGoals error:", err);
    return [];
  }
}

export async function saveGoal(goal: Goal): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;
  try {
    const docRef = doc(db, "goals", goal.id);
    await setDoc(docRef, goal, { merge: true });
    return true;
  } catch (err) {
    console.error("saveGoal error:", err);
    return false;
  }
}

// ----------------------------------------------------
// Notifications
// ----------------------------------------------------
export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  try {
    const q = query(
      collection(db, "notifications"),
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Notification);
  } catch (err) {
    console.error("fetchNotifications error:", err);
    return [];
  }
}

export async function saveNotification(notif: Notification): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db) return false;
  try {
    const docRef = doc(db, "notifications", notif.id);
    await setDoc(docRef, notif, { merge: true });
    return true;
  } catch (err) {
    console.error("saveNotification error:", err);
    return false;
  }
}
