import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRolls } from '../contexts/RollsContext';
import colors from '../constants/colors';

const RollSelector = ({
  visible,
  onClose,
  onSelect,
  selectedRollId = null,
  availableRolls,
}) => {
  const { loading, getOwnedRolls, getContributedRolls, fetchRolls } = useRolls();

  const ownedRolls = availableRolls ? availableRolls : getOwnedRolls();
  const contributedRolls = availableRolls ? [] : getContributedRolls();

  const displayedRolls = [...ownedRolls, ...contributedRolls]
    // Show everything except archived; but if no status, still show
    .filter(roll => (roll?.status || '').toLowerCase() !== 'archived')
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

  // Refresh rolls when modal opens to ensure new rolls appear (only if we are using context rolls)
  useEffect(() => {
    if (visible && !availableRolls) {
      fetchRolls();
    }
  }, [visible, fetchRolls, availableRolls]);

  const handleSelect = (roll) => {
    onSelect(roll);
    onClose();
  };

  const renderRollItem = ({ item }) => {
    const isSelected = item.id === selectedRollId;
    const isOwned = ownedRolls.some(r => r.id === item.id);

    return (
      <TouchableOpacity
        style={[styles.rollItem, isSelected && styles.rollItemSelected]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rollItemContent}>
          <View style={styles.rollItemLeft}>
            <Ionicons
              name={isOwned ? 'camera' : 'people'}
              size={24}
              color={isSelected ? colors.buttonPrimary : colors.textPrimary}
            />
            <View style={styles.rollItemText}>
              <Text style={[styles.rollItemName, isSelected && styles.rollItemNameSelected]}>
                {item.title}
              </Text>
              {item.description && (
                <Text style={styles.rollItemDescription} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
            </View>
          </View>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={24} color={colors.buttonPrimary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select a Roll</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.buttonPrimary} />
            </View>
          ) : displayedRolls.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="camera-outline" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No active rolls available</Text>
              <Text style={styles.emptySubtext}>
                Create a roll first to add photos
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchRolls}>
                <Text style={styles.retryButtonText}>Reload Rolls</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={displayedRolls}
              renderItem={renderRollItem}
              keyExtractor={(item) => item.id?.toString?.() || String(item.id)}
              style={styles.rollList}
              contentContainerStyle={styles.rollListContent}
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderTitle}>Choose a roll</Text>
                  <Text style={styles.listHeaderSubtitle}>Tap a roll to send your photo there</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.inputBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  rollList: {
    flex: 1,
  },
  rollListContent: {
    padding: 16,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  listHeaderSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rollItem: {
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  rollItemSelected: {
    borderColor: colors.buttonPrimary,
    borderWidth: 2,
    backgroundColor: colors.inputBackground,
  },
  rollItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  rollItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rollItemText: {
    marginLeft: 12,
    flex: 1,
  },
  rollItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  rollItemNameSelected: {
    color: colors.buttonPrimary,
  },
  rollItemDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: colors.buttonPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.buttonText,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RollSelector;

