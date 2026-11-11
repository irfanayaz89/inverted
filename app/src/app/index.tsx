import { Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Entry = { href: '/negative-space' | '/wrong-way-up' | null; kind: string; title: string; icon: string; blurb: string };

const GAMES: Entry[] = [
  { href: '/negative-space', kind: 'Tilt puzzle', title: 'Negative Space', icon: '◐',
    blurb: 'Roll a ball by tilting, the wrong way. Flip the phone and black and white swap, so walls become floor.' },
  { href: '/wrong-way-up', kind: 'Reflex', title: 'Wrong Way Up', icon: '↯',
    blurb: 'Swipe the way the word says. Red words mean the opposite, the arrow lies, and "up" is upside down.' },
  { href: null, kind: 'Arcade · coming next', title: 'Ceiling Stack', icon: '▤',
    blurb: 'Drop sliding blocks to build a tower that hangs from the sky.' },
  { href: null, kind: 'Typing test · coming next', title: 'Upside Type', icon: '⌨',
    blurb: 'A 60 second typing test on a keyboard that keeps getting worse.' },
  { href: null, kind: 'Brain trainer · coming next', title: 'Mirror Trace', icon: '✎',
    blurb: 'Trace a shape while your line is reflected away from your finger.' },
];

export default function Home() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.logo}>INVERTED</Text>
      <Text style={styles.lead}>Games that fight back. Hold the phone any way you like: it stays upside down. Turn it sideways and it mirrors.</Text>
      {GAMES.map((g) => {
        const card = (
          <View style={[styles.card, !g.href && styles.soon]}>
            <Text style={styles.kind}>{g.kind}</Text>
            <View style={styles.row}>
              <Text style={styles.icon}>{g.icon}</Text>
              <Text style={styles.title}>{g.title}</Text>
            </View>
            <Text style={styles.blurb}>{g.blurb}</Text>
          </View>
        );
        return g.href ? (
          <Link key={g.title} href={g.href} asChild>
            <Pressable>{card}</Pressable>
          </Link>
        ) : (
          <View key={g.title}>{card}</View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0d12' },
  content: { padding: 18, paddingTop: 64, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  logo: { fontSize: 44, fontWeight: '900', color: '#ff4f8b', textAlign: 'center', transform: [{ rotate: '180deg' }] },
  lead: { color: '#bdb6d6', textAlign: 'center', fontSize: 15, lineHeight: 21, marginBottom: 10 },
  card: { backgroundColor: '#1b1a26', borderColor: '#2f2c42', borderWidth: 1, borderRadius: 18, padding: 16 },
  soon: { opacity: 0.45 },
  kind: { color: '#ffc23d', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  icon: { fontSize: 26, color: '#fff', transform: [{ rotate: '180deg' }] },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  blurb: { color: '#cfc8e6', fontSize: 15, lineHeight: 21, marginTop: 6 },
});
