# The alert sounds

The new-order alert (the card that opens over any screen) has three sounds, chosen in Profile, Alerts and sound. They are
bundled with the JavaScript, so the alert plays the chosen one by its id with no network, offline too.

| id | Name on screen | File | Length | Size | What it is |
|---|---|---|---|---|---|
| `bell` | Bell | `src/assets/sounds/bell.mp3` | 0.55 s | 4.5 KB | Today's sound, unchanged (it was the remote `notification.mp3`; the bytes are the same file) |
| `chime` | Chime | `src/assets/sounds/chime.mp3` | 0.45 s | 6 KB | The bell a fifth up, then an octave up, softer: two short notes |
| `alarm` | Kitchen alarm (loud) | `src/assets/sounds/alarm.mp3` | 3.0 s | 49 KB | The bell 25 % faster, compressed and limited near full scale (peak -0.7 dB, about 2 dB louder in the body of each ring than the bell), six rings with a 0.05 s gap |

Where they are used: `alertSoundSource(id)` and `playAlertSound(id)` in
`src/ui/src/components/NewOrderNotification/alertRing.ts` (the id to file map, and the player: `SoundPlayer.playAsset`).
Choosing a sound on the Alerts and sound screen plays it once; "Send a test alert" and the real alert play the chosen one.
`BUNDLED_ALERT_SOUNDS` (`AlertSettings/index.ts`) lists the ids whose file exists: only those are offered. While the
alert stays open and rings again, the next ring waits for the file to end (`ringEveryMs`: at least 2.5 s, or the length
of the sound plus 1 s).

If a bundled file cannot be played (an exception, or the player's `OnSetupError` event) the alert falls back to the
remote file `https://d33aymufw4jvwf.cloudfront.net/notification.mp3`, which is the Bell. After that, silence, never a crash.

## A push in the background is always the Bell

A push notification that arrives while the app is in the background (or closed) is played by the operating system, not
by the app: it plays the native file fixed at build time, `android/app/src/main/res/raw/order_sound_notification.mp3`
and `ios/OBusiness/order_sound_notification.caf`. That file is the Bell (the same recording, padded with silence), so the
chosen sound applies to the in-app alert only. The screen says so under the picker ("A notification that arrives while
the app is in the background plays the Bell."). Changing it needs a native build (and, on Android, a new notification
channel: a channel's sound cannot be changed once created).

## How the files were made

The source is `bell.mp3` (22.05 kHz stereo, 0.55 s). Everything below is run from `src/assets/sounds/` with ffmpeg
(`/opt/homebrew/bin/ffmpeg`, built with `libmp3lame`). To replace a sound by a designed one, drop an mp3 with the same
name in the folder (keep it under about 5 s and 150 KB); nothing else changes.

```sh
cd src/assets/sounds

# Chime: the bell a fifth up (rate x 1.5, first 0.18 s, fading out) then an octave up (rate x 2), quieter (0.55 and 0.5).
ffmpeg -y -i bell.mp3 -filter_complex \
  "[0:a]asetrate=33075,aresample=44100,atrim=duration=0.18,afade=t=out:st=0.12:d=0.06,volume=0.55[a];\
[0:a]asetrate=44100,aresample=44100,volume=0.5,afade=t=out:st=0.18:d=0.09[b];\
[a][b]concat=n=2:v=0:a=1" \
  -ac 2 -c:a libmp3lame -b:a 96k chime.mp3

# Kitchen alarm: 25 % faster, heavily compressed and limited, padded to 0.5 s and repeated six times, then -1 dB of headroom.
ffmpeg -y -i bell.mp3 -af \
  "atempo=1.25,acompressor=threshold=0.02:ratio=20:attack=1:release=30:makeup=16,alimiter=limit=0.95:level=disabled,apad=whole_dur=0.5,aloop=loop=5:size=11025:start=0,volume=0.9" \
  -ac 2 -ar 44100 -c:a libmp3lame -b:a 128k alarm.mp3
```

Check them with `ffmpeg -i <file> -af volumedetect -f null -` (mean and max volume) and `ffprobe` (duration).
Measured: bell mean -16.4 dB, max -0.3 dB; chime mean -21.8 dB, max -5.9 dB; alarm max -0.7 dB, mean of the first 0.4 s
-13.8 dB against -15.1 dB for the bell.

I could not listen to them: the three were checked by their numbers (length, size, level), not by ear. Please listen to
Chime and Kitchen alarm on a device before shipping; the commands above are the knobs (the pitch rates, the compressor).
