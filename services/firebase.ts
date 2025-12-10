import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  Firestore,
  setDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { FirebaseConfig, Order } from '../types';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

// Initialize Firebase with config provided by user
export const initFirebase = (config: FirebaseConfig) => {
  if (getApps().length === 0) {
    try {
      app = initializeApp(config);
      db = getFirestore(app);
      console.log("Firebase initialized successfully");
      return true;
    } catch (error) {
      console.error("Error initializing Firebase:", error);
      return false;
    }
  } else {
    // Already initialized
    app = getApps()[0];
    db = getFirestore(app);
    return true;
  }
};

export const getDb = () => db;

// Subscribe to Orders Collection
export const subscribeToOrders = (onUpdate: (orders: Order[]) => void) => {
  if (!db) return () => {};

  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const orders: Order[] = [];
    snapshot.forEach((doc) => {
      // We store the data but ensure the ID comes from the doc ID if needed,
      // or we rely on the ID stored inside the object.
      // Firebase creates its own IDs for docs usually, but we are storing a full object.
      // Let's assume we map doc.id to our object's id for consistency or just use the data's id.
      const data = doc.data() as Order;
      // Ensure the local ID matches the document ID for updates to work smoothly
      orders.push({ ...data, id: doc.id });
    });
    onUpdate(orders);
  });

  return unsubscribe;
};

// Add Order
export const addOrderToFirebase = async (order: Order) => {
  if (!db) return;
  // We use setDoc with order.id so we control the ID (UUID generated in frontend)
  // or addDoc to let Firebase generate it.
  // To keep frontend UUID logic simple, we'll use setDoc.
  try {
    await setDoc(doc(db, 'orders', order.id), order);
  } catch (e) {
    console.error("Error adding order: ", e);
    throw e;
  }
};

// Update Order Status
export const updateOrderStatusInFirebase = async (id: string, status: string) => {
  if (!db) return;
  const orderRef = doc(db, 'orders', id);
  await updateDoc(orderRef, { status });
};

// Update Order Paid Status
export const updateOrderPaidInFirebase = async (id: string, isPaid: boolean) => {
  if (!db) return;
  const orderRef = doc(db, 'orders', id);
  await updateDoc(orderRef, { isPaid });
};

// Delete Order
export const deleteOrderFromFirebase = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'orders', id));
};
