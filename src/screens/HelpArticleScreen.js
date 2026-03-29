import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../contexts/ThemeContext';
import { getArticleById } from '../help/helpContent';
import HelpTutorialVisual from '../components/help/HelpTutorialVisual';

const HelpArticleScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const articleId = route.params?.articleId;
  const article = articleId ? getArticleById(articleId) : null;

  const renderBlocks = (blocks) => {
    return blocks.map((block, i) => {
      const key = `b-${i}`;
      switch (block.type) {
        case 'p':
          return (
            <Text key={key} style={[styles.bodyText, i > 0 && styles.paragraphSpacing]}>
              {block.text}
            </Text>
          );
        case 'step':
          return (
            <View key={key} style={[styles.stepBlock, i > 0 && styles.stepBlockSpacing]}>
              <View style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{block.n}</Text>
                </View>
                <Text style={styles.stepTitle}>{block.title}</Text>
              </View>
              {block.lines?.map((line, j) => (
                <Text key={`${key}-l-${j}`} style={[styles.bodyText, styles.stepLine]}>
                  {line}
                </Text>
              ))}
            </View>
          );
        case 'visual':
          return (
            <HelpTutorialVisual key={key} variant={block.variant} caption={block.caption} />
          );
        case 'image':
          return (
            <View key={key} style={styles.imageBlock}>
              <Image
                source={block.source}
                style={styles.helpImage}
                resizeMode="contain"
                accessibilityLabel={block.caption || 'Help screenshot'}
              />
              {block.caption ? <Text style={styles.imageCaption}>{block.caption}</Text> : null}
            </View>
          );
        default:
          return null;
      }
    });
  };

  const hasBlocks = article?.blocks && article.blocks.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navBackground} />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textWhite} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={2}>
          {article?.title ?? 'Help'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!article ? (
          <Text style={styles.bodyText}>This article could not be found.</Text>
        ) : (
          <>
            <Text style={styles.categoryLabel}>{article.category}</Text>
            <Text style={styles.title}>{article.title}</Text>
            {hasBlocks ? (
              renderBlocks(article.blocks)
            ) : (
              article.body?.map((paragraph, i) => (
                <Text key={i} style={[styles.bodyText, i > 0 && styles.paragraphSpacing]}>
                  {paragraph}
                </Text>
              ))
            )}
          </>
        )}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundLight,
    },
    header: {
      backgroundColor: colors.navBackground,
      paddingBottom: 16,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textWhite,
      flex: 1,
      textAlign: 'center',
    },
    headerRight: {
      width: 32,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    categoryLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 16,
    },
    bodyText: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.textPrimary,
    },
    paragraphSpacing: {
      marginTop: 14,
    },
    stepBlock: {},
    stepBlockSpacing: {
      marginTop: 20,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    stepBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    stepBadgeText: {
      color: colors.textWhite,
      fontWeight: '700',
      fontSize: 14,
    },
    stepTitle: {
      flex: 1,
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    stepLine: {
      marginLeft: 38,
      marginTop: 4,
    },
    imageBlock: {
      marginTop: 12,
      marginBottom: 8,
    },
    helpImage: {
      width: '100%',
      aspectRatio: 9 / 16,
      maxHeight: 420,
      borderRadius: 12,
      backgroundColor: colors.inputBackground,
    },
    imageCaption: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.textSecondary,
      marginTop: 8,
      fontStyle: 'italic',
    },
    bottomSpacing: {
      height: 32,
    },
  });

export default HelpArticleScreen;
