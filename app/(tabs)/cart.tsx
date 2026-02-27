import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCart, CartItem } from '../../context/CartContext';

function CartRow({ item }: { item: CartItem }) {
  const { increment, decrement, removeItem } = useCart();
  return (
    <View style={styles.row}>
      <Text style={styles.rowEmoji}>{item.product.emoji}</Text>
      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{item.product.name}</Text>
        <Text style={styles.rowPrice}>
          {(item.product.price * item.quantity).toFixed(2)} €
        </Text>
      </View>
      <View style={styles.qtyControl}>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => decrement(item.product.id)}>
          <Text style={styles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qty}>{item.quantity}</Text>
        <TouchableOpacity style={styles.qtyBtn} onPress={() => increment(item.product.id)}>
          <Text style={styles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => removeItem(item.product.id)} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>🗑</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyCart() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEmoji}>🛒</Text>
      <Text style={styles.emptyTitle}>Your cart is empty</Text>
      <Text style={styles.emptySubtitle}>Add products from the shop</Text>
    </View>
  );
}

export default function CartScreen() {
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const router = useRouter();

  if (items.length === 0) return <EmptyCart />;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.product.id}
        renderItem={({ item }) => <CartRow item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={clearCart}
            activeOpacity={0.7}
          >
            <Text style={styles.clearBtnText}>Clear cart</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>{totalItems} item{totalItems > 1 ? 's' : ''}</Text>
          <Text style={styles.summaryTotal}>{totalPrice.toFixed(2)} €</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={() => router.push('/checkout')}
          activeOpacity={0.85}
        >
          <Text style={styles.checkoutBtnText}>Checkout →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rowEmoji: {
    fontSize: 32,
    width: 44,
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  rowPrice: {
    fontSize: 14,
    color: '#6C63FF',
    fontWeight: '600',
    marginTop: 2,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    color: '#6C63FF',
    fontWeight: '700',
    lineHeight: 22,
  },
  qty: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    minWidth: 20,
    textAlign: 'center',
  },
  deleteBtn: {
    padding: 4,
  },
  deleteText: {
    fontSize: 18,
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 8,
    padding: 10,
  },
  clearBtnText: {
    color: '#FF4757',
    fontWeight: '600',
    fontSize: 14,
  },
  summary: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#555',
  },
  summaryTotal: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  checkoutBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F7F8FC',
  },
  emptyEmoji: {
    fontSize: 72,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#999',
  },
});
