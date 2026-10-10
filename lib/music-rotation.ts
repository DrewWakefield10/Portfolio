import { adjacentTrack, type MusicTrack } from './music'

// One instance per theme keeps a shuffle cycle intact across theme switches.
export class MusicRotation {
  private bag: string[] = []
  private firstCycle = true
  private history: string[] = []
  private cursor = -1

  constructor(private random = Math.random) {}

  resetShuffle() {
    this.bag = []
    this.firstCycle = true
  }

  remember(id: string) {
    if (this.history[this.cursor] === id) return
    this.history = this.history.slice(0, this.cursor + 1)
    this.history.push(id)
    if (this.history.length > 50) this.history.shift()
    this.cursor = this.history.length - 1
  }

  take(tracks: readonly MusicTrack[], currentId: string, direction: -1 | 1, shuffle: boolean) {
    if (!tracks.length) return undefined
    const available = new Map(tracks.map(track => [track.id, track]))
    if (available.has(currentId)) this.remember(currentId)
    if (shuffle) {
      // Previous retraces actual playback; Next can return along that history.
      let cursor = this.cursor + direction
      while (cursor >= 0 && cursor < this.history.length) {
        const historical = available.get(this.history[cursor])
        if (historical && historical.id !== currentId) {
          this.cursor = cursor
          return historical
        }
        cursor += direction
      }
    }
    let track: MusicTrack | undefined
    if (shuffle && direction === 1 && tracks.length > 1) {
      this.bag = this.bag.filter(id => available.has(id))
      if (!this.bag.length) {
        // The current song counts as heard in the first cycle. Later bags
        // contain every song, with the first entry avoiding the previous song.
        this.bag = tracks.filter(item => !this.firstCycle || item.id !== currentId).map(item => item.id)
        this.firstCycle = false
        for (let i = this.bag.length - 1; i > 0; i--) {
          const j = Math.max(0, Math.min(i, Math.floor(this.random() * (i + 1))))
          ;[this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]
        }
      }
      if (this.bag[0] === currentId && this.bag.length > 1) {
        ;[this.bag[0], this.bag[1]] = [this.bag[1], this.bag[0]]
      }
      track = available.get(this.bag.shift() ?? '')
    } else {
      track = adjacentTrack(tracks, currentId, direction, false)
    }
    if (track) this.remember(track.id)
    return track
  }
}
