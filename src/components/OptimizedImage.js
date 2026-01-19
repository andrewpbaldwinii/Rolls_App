import React, { useState } from 'react';
import { Image, View, ActivityIndicator, StyleSheet } from 'react-native';
import colors from '../constants/colors';

/**
 * Optimized Image component with loading states and error handling
 * Reduces perceived latency by showing loading indicators
 */
const OptimizedImage = ({ 
  source, 
  style, 
  resizeMode = 'cover',
  showLoadingIndicator = true,
  ...props 
}) => {
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

const styles = StyleSheet.create({
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

export default OptimizedImage;
