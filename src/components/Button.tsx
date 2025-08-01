import React from 'react'
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'warning' | 'outline'
type ButtonSize = 'small' | 'medium' | 'large'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  icon?: keyof typeof Ionicons.glyphMap
  iconPosition?: 'left' | 'right'
  style?: ViewStyle
  textStyle?: TextStyle
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
}: ButtonProps) {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.buttonDisabled,
    style,
  ]

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ]

  const iconSize = size === 'small' ? 16 : size === 'large' ? 24 : 20
  const iconColor = variant === 'outline' || variant === 'secondary'
    ? '#666'
    : variant === 'primary'
    ? 'white'
    : variant === 'danger'
    ? 'white'
    : variant === 'warning'
    ? 'white'
    : '#666'

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'secondary' ? '#666' : 'white'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.iconLeft} />
          )}
          <Text style={textStyles}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={iconSize} color={iconColor} style={styles.iconRight} />
          )}
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Variants
  button_primary: {
    backgroundColor: '#4CAF50',
  },
  button_secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 0,
    shadowOpacity: 0,
  },
  button_danger: {
    backgroundColor: '#f44336',
  },
  button_warning: {
    backgroundColor: '#FF9800',
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 0,
    shadowOpacity: 0,
  },

  // Sizes
  button_small: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  button_medium: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  button_large: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },

  // Text styles
  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: 'white',
  },
  text_secondary: {
    color: '#666',
  },
  text_danger: {
    color: 'white',
  },
  text_warning: {
    color: 'white',
  },
  text_outline: {
    color: '#666',
  },

  // Text sizes
  text_small: {
    fontSize: 12,
  },
  text_medium: {
    fontSize: 14,
  },
  text_large: {
    fontSize: 16,
  },

  // Disabled states
  buttonDisabled: {
    opacity: 0.6,
  },
  textDisabled: {
    opacity: 0.6,
  },

  // Icon spacing
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
})