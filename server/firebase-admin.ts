// This is a temporary version of the firebase-admin module that works in memory
// so we can develop and test without real Firebase credentials
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

// Create our own simple in-memory implementation of Firestore for development/testing
class MemoryFirestore {
  private collections: Record<string, Record<string, any>> = {};

  collection(name: string) {
    if (!this.collections[name]) {
      this.collections[name] = {};
    }

    return {
      doc: (id?: string) => {
        const docId = id || uuidv4();
        return {
          id: docId,
          get: async () => {
            const data = this.collections[name][docId];
            return {
              id: docId,
              exists: !!data,
              data: () => data || null,
            };
          },
          set: async (data: any) => {
            this.collections[name][docId] = data;
            return {
              id: docId,
              ...data
            };
          },
          update: async (data: any) => {
            this.collections[name][docId] = {
              ...this.collections[name][docId],
              ...data
            };
            return {
              id: docId,
              ...this.collections[name][docId]
            };
          },
          delete: async () => {
            delete this.collections[name][docId];
          }
        };
      },
      where: (field: string, operator: string, value: any) => {
        return {
          get: async () => {
            const results = Object.entries(this.collections[name] || {})
              .filter(([_, data]) => {
                if (operator === '==') return data[field] === value;
                if (operator === '!=') return data[field] !== value;
                if (operator === '>') return data[field] > value;
                if (operator === '>=') return data[field] >= value;
                if (operator === '<') return data[field] < value;
                if (operator === '<=') return data[field] <= value;
                return false;
              })
              .map(([id, data]) => ({
                id,
                data: () => data,
                exists: true
              }));
            
            return {
              empty: results.length === 0,
              docs: results
            };
          }
        };
      },
      get: async () => {
        const docs = Object.entries(this.collections[name] || {}).map(([id, data]) => ({
          id,
          data: () => data,
          exists: true
        }));
        
        return {
          empty: docs.length === 0,
          docs
        };
      }
    };
  }

  batch() {
    const operations: Array<() => Promise<void>> = [];
    
    return {
      set: (doc: any, data: any) => {
        operations.push(() => doc.set(data));
      },
      update: (doc: any, data: any) => {
        operations.push(() => doc.update(data));
      },
      delete: (doc: any) => {
        operations.push(() => doc.delete());
      },
      commit: async () => {
        for (const operation of operations) {
          await operation();
        }
      }
    };
  }
}

// Memory-based Firebase Auth
class MemoryAuth {
  private users: Record<string, any> = {};
  
  async createUser(userData: any) {
    const uid = uuidv4();
    this.users[uid] = userData;
    return { uid, ...userData };
  }
}

// Memory-based Firebase Storage
class MemoryStorage {
  bucket() {
    return {
      upload: async (filePath: string, options: any) => {
        console.log(`[MEMORY STORAGE] File uploaded: ${filePath}`, options);
        return [{ name: filePath }];
      },
      file: (fileName: string) => ({
        getSignedUrl: async (options: any) => {
          return [`https://example.com/storage/${fileName}`];
        },
        delete: async () => {
          console.log(`[MEMORY STORAGE] File deleted: ${fileName}`);
        }
      })
    };
  }
}

// Simulated Timestamp implementation
export class Timestamp {
  constructor(public seconds: number, public nanoseconds: number) {}
  
  static now() {
    const now = new Date();
    return new Timestamp(Math.floor(now.getTime() / 1000), 0);
  }
  
  static fromDate(date: Date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }
  
  toDate() {
    return new Date(this.seconds * 1000);
  }
  
  toMillis() {
    return this.seconds * 1000 + this.nanoseconds / 1000000;
  }

  toString() {
    return `Timestamp(seconds=${this.seconds}, nanoseconds=${this.nanoseconds})`;
  }
}

// Create our in-memory implementation for now
console.warn('Using in-memory Firebase implementation for development');
const app = {} as admin.app.App; // Mock app
const db = new MemoryFirestore() as unknown as FirebaseFirestore.Firestore;
const auth = new MemoryAuth() as unknown as admin.auth.Auth;
const storage = new MemoryStorage().bucket() as unknown as any; // Using any for now

// For compatibility with FieldValue
const FieldValue = {
  serverTimestamp: () => new Timestamp(Math.floor(Date.now() / 1000), 0),
  increment: (n: number) => ({ __increment: n }),
  arrayUnion: (...elements: any[]) => ({ __arrayUnion: elements }),
  arrayRemove: (...elements: any[]) => ({ __arrayRemove: elements }),
  delete: () => ({ __delete: true })
};

// Export Firebase services
export { db, auth, storage, app, FieldValue };
export default app;