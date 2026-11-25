import { StyleSheet } from 'react-native';

/**
 * A VideoView filling its box. On the web it is a <video>, which absolute insets alone don't stretch: without a width
 * and height it keeps the clip's own size and spills out, so a portrait clip showed only its top.
 */
export const VIDEO_FILL = StyleSheet.create({ fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' } }).fill;
