import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';

cssInterop(ExpoLinearGradient, { className: 'style' });

export { ExpoLinearGradient as LinearGradient };
