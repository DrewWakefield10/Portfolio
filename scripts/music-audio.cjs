// Read-only verification: FFmpeg decodes the entire file; no assets are rewritten.
const { spawnSync } = require('node:child_process')

const MASTERING = { integratedLufs: -24, toleranceLu: 1.5, maxTruePeakDbtp: -2, maxSilenceSeconds: 3 }

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', windowsHide: true, timeout: 120000, maxBuffer: 4 * 1024 * 1024 })
  if (result.error) throw Error(command + ' is required for music verification: ' + result.error.message)
  if (result.status !== 0) throw Error(command + ' could not decode audio: ' + result.stderr.slice(-1500))
  return result
}

function analyzeAudio(file) {
  const metadata = JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries',
    'format=duration,size,bit_rate:stream=codec_type,codec_name,sample_rate,channels', '-of', 'json', file]).stdout)
  const stream = metadata.streams?.find(value => value.codec_type === 'audio')
  if (!stream) throw Error('No audio stream: ' + file)
  const decoded = run('ffmpeg', ['-hide_banner', '-nostats', '-xerror', '-i', file, '-map', '0:a:0', '-vn', '-af',
    'silencedetect=noise=-60dB:d=1,loudnorm=I=-24:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'])
  const match = decoded.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)
  if (!match) throw Error('No loudness measurement: ' + file)
  const loudness = JSON.parse(match[0])
  const silence = [...decoded.stderr.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)]
    .map(value => ({ end: Number(value[1]), duration: Number(value[2]) }))
  return {
    durationSeconds: Number(metadata.format?.duration), bytes: Number(metadata.format?.size),
    codec: stream.codec_name, sampleRate: Number(stream.sample_rate), channels: stream.channels,
    integratedLufs: Number(loudness.input_i), truePeakDbtp: Number(loudness.input_tp),
    loudnessRangeLu: Number(loudness.input_lra), silence,
  }
}

function verifyMaster(analysis, file) {
  if (!Number.isFinite(analysis.durationSeconds) || analysis.durationSeconds < 60 || analysis.durationSeconds > 180.1) {
    throw Error('Expected playable 1-3 minute audio: ' + file)
  }
  if (!Number.isFinite(analysis.integratedLufs) || !Number.isFinite(analysis.truePeakDbtp)) {
    throw Error('Silent or unmeasurable audio: ' + file)
  }
  if (Math.abs(analysis.integratedLufs - MASTERING.integratedLufs) > MASTERING.toleranceLu) {
    throw Error('Master must measure -24 LUFS (+/-1.5 LU) to match the existing soundtrack: ' + file)
  }
  if (analysis.truePeakDbtp > MASTERING.maxTruePeakDbtp) throw Error('True peak exceeds -2 dBTP: ' + file)
  if (analysis.silence.some(value => value.duration > MASTERING.maxSilenceSeconds)) {
    throw Error('Audio contains more than 3 seconds of silence: ' + file)
  }
}

function suppliedTrackGain(analysis, file) {
  if (!Number.isFinite(analysis.durationSeconds) || analysis.durationSeconds <= 1) {
    throw Error('Expected a playable supplied song: ' + file)
  }
  if (!Number.isFinite(analysis.integratedLufs) || !Number.isFinite(analysis.truePeakDbtp)) {
    throw Error('Silent or unmeasurable audio: ' + file)
  }
  if (analysis.silence.some(value => value.duration > Math.max(15, analysis.durationSeconds / 2))) {
    throw Error('Supplied song contains excessive silence: ' + file)
  }
  // Attenuate loud masters in the existing media element, without re-encoding
  // files or boosting quiet recordings. Natural song lengths/tails are retained.
  const adjustmentDb = Math.min(0, MASTERING.integratedLufs - analysis.integratedLufs,
    MASTERING.maxTruePeakDbtp - analysis.truePeakDbtp)
  return Number((10 ** (adjustmentDb / 20)).toFixed(6))
}

module.exports = { analyzeAudio, verifyMaster, suppliedTrackGain, MASTERING }
