import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useRef } from 'react';
import { PRODUCTS, Product } from '../../data/products';
import { useCart } from '../../context/CartContext';

function ProductCard({ product }: { product: Product }) {
  const { addItem, items } = useCart();
  const scale = useRef(new Animated.Value(1)).current;
  const inCart = items.find(i => i.product.id === product.id);

  function handleAdd() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    addItem(product);
  }

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{product.emoji}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.category}>{product.category}</Text>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {product.description}
        </Text>
        <View style={styles.cardFooter}>
          <Text style={styles.price}>{product.price.toFixed(2)} €</Text>
          <TouchableOpacity
            style={[styles.addBtn, inCart && styles.addBtnActive]}
            onPress={handleAdd}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>
              {inCart ? `✓ In cart (${inCart.quantity})` : '+ Add'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

export default function ProductsScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={PRODUCTS}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <ProductCard product={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
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
    gap: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emojiBox: {
    width: 90,
    backgroundColor: '#F0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 42,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  category: {
    fontSize: 11,
    color: '#6C63FF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  description: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  addBtn: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnActive: {
    backgroundColor: '#4CAF50',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});
