import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

type LangChoice = { label: string; value: string | undefined };

const LANGUAGES: LangChoice[] = [
  { label: 'Auto', value: undefined },
  { label: 'עברית', value: 'he-IL' },
  { label: 'English', value: 'en-US' },
  { label: 'Русский', value: 'ru-RU' },
  { label: 'العربية', value: 'ar-SA' },
];

export default function App() {
  const [transcript, setTranscript] = useState('');
  const [partial, setPartial] = useState('');
  const [recording, setRecording] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [langValue, setLangValue] = useState<string | undefined>('he-IL');

  useSpeechRecognitionEvent('start', () => setRecording(true));
  useSpeechRecognitionEvent('end', () => {
    setRecording(false);
    setPartial('');
  });
  useSpeechRecognitionEvent('result', (event) => {
    const best = event.results?.[0]?.transcript ?? '';
    if (event.isFinal) {
      setTranscript((prev) => (prev ? prev + ' ' + best : best).trim());
      setPartial('');
    } else {
      setPartial(best);
    }
  });
  useSpeechRecognitionEvent('languagedetection', (event: any) => {
    const locale = event?.detectedLocale ?? event?.detectedLanguage;
    if (locale) setDetectedLang(locale);
  });
  useSpeechRecognitionEvent('error', (event) => {
    setRecording(false);
    setPartial('');
    Alert.alert('Speech error', `${event.error}: ${event.message ?? ''}`);
  });

  const start = async () => {
    try {
      const perms =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perms.granted) {
        Alert.alert(
          'Permission required',
          'Microphone and speech recognition permissions are needed.',
        );
        return;
      }

      const androidIntentOptions: Record<string, any> = {
        EXTRA_LANGUAGE_MODEL: 'free_form',
        EXTRA_PARTIAL_RESULTS: true,
      };

      // When user picks "Auto", ask Android to actually try to detect the
      // spoken language. (Only some devices/services honor this.)
      if (!langValue) {
        androidIntentOptions.EXTRA_ENABLE_LANGUAGE_DETECTION = true;
        androidIntentOptions.EXTRA_LANGUAGE_DETECTION_ALLOWED_LANGUAGES = [
          'he-IL',
          'en-US',
          'ru-RU',
          'ar-SA',
        ];
      }

      ExpoSpeechRecognitionModule.start({
        ...(langValue ? { lang: langValue } : {}),
        interimResults: true,
        continuous: true,
        addsPunctuation: true,
        requiresOnDeviceRecognition: false,
        androidIntentOptions,
      } as any);
    } catch (e: any) {
      Alert.alert('Could not start', String(e?.message ?? e));
    }
  };

  const stop = () => ExpoSpeechRecognitionModule.stop();

  const clear = () => {
    setTranscript('');
    setPartial('');
    setDetectedLang(null);
  };

  const displayed = (transcript + (partial ? ' ' + partial : '')).trim();
  const currentLabel =
    LANGUAGES.find((l) => l.value === langValue)?.label ?? 'Auto';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Voice → Text</Text>
      <Text style={styles.lang}>
        Language: {currentLabel}
        {detectedLang ? `  •  detected: ${detectedLang}` : ''}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.langRow}
        contentContainerStyle={styles.langRowContent}>
        {LANGUAGES.map((l) => {
          const selected = l.value === langValue;
          return (
            <TouchableOpacity
              key={l.label}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setLangValue(l.value)}
              disabled={recording}>
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}>
                {l.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.textWrap} contentContainerStyle={styles.textPad}>
        <TextInput
          style={styles.text}
          multiline
          editable
          value={displayed}
          onChangeText={setTranscript}
          placeholder="Tap Record and start speaking…"
          placeholderTextColor="#888"
        />
      </ScrollView>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, recording ? styles.btnStop : styles.btnRecord]}
          onPress={recording ? stop : start}>
          <Text style={styles.btnText}>{recording ? '■ Stop' : '● Record'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.btnClear]} onPress={clear}>
          <Text style={styles.btnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        {Platform.OS === 'android'
          ? 'Tip: install Google app + download Hebrew offline pack in Google → Settings → Voice → Offline speech recognition.'
          : 'Tip: enable Hebrew dictation in Settings → General → Keyboard.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 4 },
  lang: { color: '#9aa', fontSize: 13, marginBottom: 8 },
  langRow: { flexGrow: 0, marginBottom: 12 },
  langRowContent: { gap: 8, paddingRight: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1b1f27',
    borderWidth: 1,
    borderColor: '#2a2f3a',
  },
  chipSelected: { backgroundColor: '#3a6df0', borderColor: '#3a6df0' },
  chipText: { color: '#bbb', fontSize: 14 },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  textWrap: {
    flex: 1,
    backgroundColor: '#1b1f27',
    borderRadius: 12,
    marginBottom: 16,
  },
  textPad: { padding: 8 },
  text: {
    color: '#fff',
    fontSize: 18,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnRecord: { backgroundColor: '#d9534f' },
  btnStop: { backgroundColor: '#444' },
  btnClear: { backgroundColor: '#2a2f3a' },
  btnText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  hint: { color: '#667', fontSize: 12, textAlign: 'center', marginBottom: 12 },
});
