import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { feedback } from '../engine/feedback';
import { FlipMode, MODES, flipText } from '../games/flipText';

/**
 * Flip Text is a utility, so this screen is the one place in the app that is NOT
 * inverted: you need to be able to type. The output is what's upside down.
 */
export default function FlipTextScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<FlipMode>('upside');
  const [note, setNote] = useState('');

  const out = flipText(text, mode);
  const say = (m: string) => { setNote(m); setTimeout(() => setNote(''), 1600); };

  const copy = async () => {
    if (!out) return;
    try { await Clipboard.setStringAsync(out); feedback.tick(); say('Copied'); } catch { say("Couldn't copy"); }
  };
  const share = async () => {
    if (!out) return;
    try {
      if (Platform.OS === 'web') {
        const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> };
        if (nav.share) await nav.share({ text: out });
        else await copy();
      } else {
        await Share.share({ message: out });
      }
    } catch { /* share sheet dismissed */ }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Flip Text</Text>
        <Text style={styles.sub}>Type something. Post it upside down.</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type here"
          placeholderTextColor="#77748a"
          multiline
          autoCorrect={false}
        />
        <View style={styles.modes}>
          {MODES.map((m) => (
            <Pressable key={m.id} onPress={() => setMode(m.id)} style={[styles.mode, mode === m.id && styles.modeOn]}>
              <Text style={[styles.modeText, mode === m.id && styles.modeTextOn]}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.out}>
          <Text style={styles.outText} selectable>{out || flipText('Your flipped text shows up here', mode)}</Text>
        </View>
        <View style={styles.modes}>
          <Pressable style={[styles.btn, !out && styles.off]} onPress={copy}><Text style={styles.btnText}>Copy</Text></Pressable>
          <Pressable style={[styles.btn, styles.alt, !out && styles.off]} onPress={share}><Text style={styles.btnText}>Share</Text></Pressable>
        </View>
        <Text style={styles.note}>{note || ' '}</Text>
      </ScrollView>
      <Pressable style={styles.close} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={12}>
        <Text style={styles.closeText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0d12' },
  content: { padding: 22, paddingTop: 100, gap: 14, maxWidth: 520, width: '100%', alignSelf: 'center' },
  title: { fontSize: 40, fontWeight: '900', color: '#ff4f8b', textAlign: 'center', transform: [{ rotate: '180deg' }] },
  sub: { color: '#bdb6d6', fontSize: 16, textAlign: 'center' },
  input: { minHeight: 110, backgroundColor: '#1b1a26', borderColor: '#2f2c42', borderWidth: 1, borderRadius: 14, padding: 14, color: '#fff', fontSize: 18, textAlignVertical: 'top' },
  modes: { flexDirection: 'row', gap: 10 },
  mode: { flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: '#1b1a26', alignItems: 'center' },
  modeOn: { backgroundColor: '#ffc23d' },
  modeText: { color: '#cfc8e6', fontWeight: '700' },
  modeTextOn: { color: '#15151d' },
  out: { minHeight: 110, backgroundColor: '#15151d', borderRadius: 14, padding: 14 },
  outText: { color: '#fff', fontSize: 20, lineHeight: 28 },
  btn: { flex: 1, backgroundColor: '#ff4f8b', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  alt: { backgroundColor: '#3a3550' },
  off: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  note: { color: '#29d17d', textAlign: 'center', fontSize: 15 },
  close: { position: 'absolute', top: 44, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff22', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
