import { User, SavedAccountInfo } from '../types';

const LAST_ACCOUNT_KEY = 'sms_last_account';
const SAVED_ACCOUNTS_KEY = 'sms_saved_accounts';

/**
 * Normalizes and deduplicates a list of saved accounts.
 * Strict deduplication by ID, lowercase username, and lowercase email.
 */
export function deduplicateSavedAccounts(accounts: SavedAccountInfo[]): SavedAccountInfo[] {
  if (!Array.isArray(accounts)) return [];

  const seenIds = new Set<string>();
  const seenUsernames = new Set<string>();
  const seenEmails = new Set<string>();
  const deduplicated: SavedAccountInfo[] = [];

  for (const acc of accounts) {
    if (!acc || (!acc.id && !acc.username && !acc.email)) continue;

    const id = (acc.id || '').trim();
    const username = (acc.username || '').trim().toLowerCase();
    const email = (acc.email || '').trim().toLowerCase();

    // Check if already seen
    const idSeen = id && seenIds.has(id);
    const userSeen = username && seenUsernames.has(username);
    const emailSeen = email && seenEmails.has(email);

    if (!idSeen && !userSeen && !emailSeen) {
      if (id) seenIds.add(id);
      if (username) seenUsernames.add(username);
      if (email) seenEmails.add(email);

      deduplicated.push({
        id: id || `usr_${username || email}`,
        fullName: acc.fullName || acc.username || 'User',
        username: acc.username || '',
        email: acc.email || '',
        lastLoginAt: acc.lastLoginAt || new Date().toISOString(),
      });
    }
  }

  return deduplicated;
}

/**
 * Loads all saved accounts on this device, guaranteed clean & deduplicated.
 */
export function getSavedAccountsFromDevice(): {
  primaryAccount: SavedAccountInfo | null;
  otherAccounts: SavedAccountInfo[];
} {
  try {
    // 1. Load list
    let list: SavedAccountInfo[] = [];
    const listRaw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (listRaw) {
      const parsed = JSON.parse(listRaw);
      if (Array.isArray(parsed)) {
        list = parsed;
      }
    }

    // 2. Load primary / last account
    let lastAcc: SavedAccountInfo | null = null;
    const lastRaw = localStorage.getItem(LAST_ACCOUNT_KEY);
    if (lastRaw) {
      const parsedLast = JSON.parse(lastRaw);
      if (parsedLast && (parsedLast.id || parsedLast.username || parsedLast.email)) {
        lastAcc = parsedLast;
      }
    }

    // Combine for global deduplication
    const combined: SavedAccountInfo[] = [];
    if (lastAcc) combined.push(lastAcc);
    combined.push(...list);

    const cleanList = deduplicateSavedAccounts(combined);

    if (cleanList.length === 0) {
      return { primaryAccount: null, otherAccounts: [] };
    }

    const primary = cleanList[0];
    // "Other saved accounts" strictly excludes primary by ID, username, and email
    const others = cleanList.slice(1).filter((acc) => {
      const sameId = primary.id && acc.id === primary.id;
      const sameUser = primary.username && acc.username.toLowerCase() === primary.username.toLowerCase();
      const sameEmail = primary.email && acc.email.toLowerCase() === primary.email.toLowerCase();
      return !sameId && !sameUser && !sameEmail;
    });

    // Write back cleaned state so dirty duplicates are pruned immediately
    localStorage.setItem(LAST_ACCOUNT_KEY, JSON.stringify(primary));
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(cleanList));

    return { primaryAccount: primary, otherAccounts: others };
  } catch (err) {
    console.warn('[AccountStorage] Error reading saved accounts:', err);
    return { primaryAccount: null, otherAccounts: [] };
  }
}

/**
 * Saves a user to device storage as the primary saved account.
 * Updates in-place if already saved, avoiding any duplication.
 */
export function saveAccountToDevice(user: User): {
  primaryAccount: SavedAccountInfo;
  otherAccounts: SavedAccountInfo[];
} {
  try {
    const newEntry: SavedAccountInfo = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      lastLoginAt: new Date().toISOString(),
    };

    // Load existing
    const { primaryAccount, otherAccounts } = getSavedAccountsFromDevice();
    const existing = primaryAccount ? [primaryAccount, ...otherAccounts] : [];

    // Filter out any matching entry
    const cleanId = (user.id || '').trim();
    const cleanUser = (user.username || '').trim().toLowerCase();
    const cleanEmail = (user.email || '').trim().toLowerCase();

    const remaining = existing.filter((acc) => {
      const matchId = cleanId && acc.id === cleanId;
      const matchUser = cleanUser && acc.username.toLowerCase() === cleanUser;
      const matchEmail = cleanEmail && acc.email.toLowerCase() === cleanEmail;
      return !matchId && !matchUser && !matchEmail;
    });

    const updatedList = [newEntry, ...remaining].slice(0, 5);
    const cleanList = deduplicateSavedAccounts(updatedList);

    const primary = cleanList[0];
    const others = cleanList.slice(1);

    localStorage.setItem(LAST_ACCOUNT_KEY, JSON.stringify(primary));
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(cleanList));

    return { primaryAccount: primary, otherAccounts: others };
  } catch (err) {
    console.warn('[AccountStorage] Error saving account:', err);
    const fallback: SavedAccountInfo = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      lastLoginAt: new Date().toISOString(),
    };
    return { primaryAccount: fallback, otherAccounts: [] };
  }
}

/**
 * Removes an account from this device's saved accounts list.
 * Does NOT delete the account from the database.
 */
export function removeAccountFromDevice(idOrUsernameOrEmail: string): {
  primaryAccount: SavedAccountInfo | null;
  otherAccounts: SavedAccountInfo[];
} {
  try {
    const target = (idOrUsernameOrEmail || '').trim().toLowerCase();
    if (!target) return getSavedAccountsFromDevice();

    const { primaryAccount, otherAccounts } = getSavedAccountsFromDevice();
    const existing = primaryAccount ? [primaryAccount, ...otherAccounts] : [];

    const remaining = existing.filter((acc) => {
      const matchId = acc.id && acc.id.toLowerCase() === target;
      const matchUser = acc.username && acc.username.toLowerCase() === target;
      const matchEmail = acc.email && acc.email.toLowerCase() === target;
      return !matchId && !matchUser && !matchEmail;
    });

    const cleanList = deduplicateSavedAccounts(remaining);

    if (cleanList.length === 0) {
      localStorage.removeItem(LAST_ACCOUNT_KEY);
      localStorage.removeItem(SAVED_ACCOUNTS_KEY);
      return { primaryAccount: null, otherAccounts: [] };
    }

    const newPrimary = cleanList[0];
    const newOthers = cleanList.slice(1);

    localStorage.setItem(LAST_ACCOUNT_KEY, JSON.stringify(newPrimary));
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(cleanList));

    return { primaryAccount: newPrimary, otherAccounts: newOthers };
  } catch (err) {
    console.warn('[AccountStorage] Error removing saved account:', err);
    return { primaryAccount: null, otherAccounts: [] };
  }
}

/**
 * Clears all saved accounts from this device.
 */
export function clearAllSavedAccountsFromDevice(): void {
  try {
    localStorage.removeItem(LAST_ACCOUNT_KEY);
    localStorage.removeItem(SAVED_ACCOUNTS_KEY);
  } catch (err) {
    // Ignore storage error
  }
}
