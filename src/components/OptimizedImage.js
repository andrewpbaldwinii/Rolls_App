import React, { useState, useMemo } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.inputBackground,
    },
    loadingContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
    },
    hidden: {
      opacity: 0,
    },
  });

/**
 * Optimized Image component with loading states and error handling
 */
const OptimizedImage = ({
  source,
  style,
  resizeMode = 'cover',
  showLoadingIndicator = true,
  ...props
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  return (
    <View style={[style, styles.container]}>
      {loading && showLoadingIndicator && (
        <View style={[StyleSheet.absoluteFill, styles.loadingContainer]}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      )}
      <Image
        source={source}
        style={[style, loading && styles.hidden]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        {...props}
      />
    </View>
  );
};

export default OptimizedImage;
