import { Image } from 'react-native';
import { InstagramBrandIcon, FacebookBrandIcon, WhatsAppBrandIcon } from './SocialBrandIcons';

/** Logos oficiales en apps/clientes/assets/social/ */
const INSTAGRAM_LOGO = require('../../assets/social/Instagram.png');
const FACEBOOK_LOGO = require('../../assets/social/Facebook.png');
const WHATSAPP_LOGO = require('../../assets/social/WhatsApp.png');

function logoSource(asset) {
  // Metro devuelve un número; en web puede ser { uri, width, height }.
  if (asset == null) return null;
  if (typeof asset === 'number' || typeof asset === 'object') return asset;
  return null;
}

function BrandLogo({ source, fallback: Fallback, size = 28 }) {
  const resolved = logoSource(source);
  if (!resolved) return <Fallback size={size} />;
  return (
    <Image
      source={resolved}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

export function InstagramLogo({ size = 28 }) {
  return <BrandLogo source={INSTAGRAM_LOGO} fallback={InstagramBrandIcon} size={size} />;
}

export function FacebookLogo({ size = 28 }) {
  return <BrandLogo source={FACEBOOK_LOGO} fallback={FacebookBrandIcon} size={size} />;
}

export function WhatsAppLogo({ size = 28 }) {
  return <BrandLogo source={WHATSAPP_LOGO} fallback={WhatsAppBrandIcon} size={size} />;
}
