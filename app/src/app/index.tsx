import { Href, Link } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Entry = { href: Href; kind: string; title: string; icon: string; blurb: string };

const GAMES: Entry[] = [
  { href: '/negative-space', kind: 'Tilt puzzle', title: 'Negative Space', icon: '◐',
    blurb: 'Roll a ball by tilting, the wrong way. Flip the phone and black and white swap, so walls become floor.' },
  { href: '/wrong-way-up', kind: 'Reflex', title: 'Wrong Way Up', icon: '↯',
    blurb: 'Swipe the way the word says. Red words mean the opposite, the arrow lies, and "up" is upside down.' },
  { href: '/ceiling-stack', kind: 'Arcade', title: 'Ceiling Stack', icon: '▤',
    blurb: 'Tap to drop sliding blocks and build a tower that hangs from the sky. Tilting blows the block like wind.' },
  { href: '/upfall', kind: 'Arcade', title: 'Upfall', icon: '★',
    blurb: 'Stars and bombs fall up. Catch the stars with a paddle that tilts the wrong way.' },
  { href: '/flip-off', kind: 'Party', title: 'Flip Off', icon: '⟳',
    blurb: 'The phone shouts a pose: upside down, sideways, face down. Get it there in time, unless it is a trap.' },
  { href: '/echo-back', kind: 'Memory', title: 'Echo Back', icon: '◩',
    blurb: 'Watch the pads light up, then play the pattern backwards. Sometimes the board spins first.' },
  { href: '/upside-type', kind: 'Typing test', title: 'Upside Type', icon: '⌨',
    blurb: 'A 60 second typing test on a keyboard that keeps getting worse.' },
  { href: '/mirror-trace', kind: 'Brain trainer', title: 'Mirror Trace', icon: '✎',
    blurb: 'Trace a shape while your line is reflected away from your finger.' },
];

const APPS: Entry[] = [
  { href: '/flip-focus', kind: 'Focus timer', title: 'Flip Focus', icon: '◔',
    blurb: 'A focus timer that only runs while your phone is face down. Peek and you break your streak.' },
  { href: '/flip-text', kind: 'Text tool', title: 'Flip Text', icon: '¿',
    blurb: 'Type anything and get it upside down or backwards, ready to copy and post.' },
];

function Card({ g }: { g: Entry }) {
  return (
    <Link href={g.href} asChild>
      <Pressable>
        <View style={styles.card}>
          <Text style={styles.kind}>{g.kind}</Text>
          <View style={styles.row}>
            <Text style={styles.icon}>{g.icon}</Text>
            <Text style={styles.title}>{g.title}</Text>
          </View>
          <Text style={styles.blurb}>{g.blurb}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

export default function Home() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.logo}>INVERTED</Text>
      <Text style={styles.lead}>Games and apps that fight back. Hold the phone any way you like: it stays upside down. Turn it sideways and it mirrors.</Text>
      <Text style={styles.section}>Games</Text>
      {GAMES.map((g) => <Card key={g.title} g={g} />)}
      <Text style={styles.section}>Apps</Text>
      {APPS.map((g) => <Card key={g.title} g={g} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0d0d12' },
  content: { padding: 18, paddingTop: 64, paddingBottom: 60, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  logo: { fontSize: 44, fontWeight: '900', color: '#ff4f8b', textAlign: 'center', transform: [{ rotate: '180deg' }] },
  lead: { color: '#bdb6d6', textAlign: 'center', fontSize: 15, lineHeight: 21, marginBottom: 10 },
  card: { backgroundColor: '#1b1a26', borderColor: '#2f2c42', borderWidth: 1, borderRadius: 18, padding: 16 },
  section: { color: '#8f89a6', fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginTop: 10 },
  kind: { color: '#ffc23d', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  icon: { fontSize: 26, color: '#fff', transform: [{ rotate: '180deg' }] },
  title: { color: '#fff', fontSize: 22, fontWeight: '800' },
  blurb: { color: '#cfc8e6', fontSize: 15, lineHeight: 21, marginTop: 6 },
});
