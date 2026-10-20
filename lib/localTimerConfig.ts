export type LocalTimerVariant = 'pastel' | 'cozy' | 'rain' | 'anime' | 'stopwatch'

export const localTimerConfig = {
  pastel: { name: 'The sunset desk', caption: 'A little space to learn.', focus: 25, rest: 5, presets: [15, 25, 50], prompt: 'One thing to learn', placeholder: 'Understand one new idea', tip: 'Close your notes at the end. What can you explain from memory?' },
  cozy: { name: 'The quiet corner', caption: 'Get comfortable. Begin small.', focus: 25, rest: 5, presets: [15, 25, 45], prompt: 'On the desk today', placeholder: 'Read a chapter with a cup of tea', tip: 'Put your book, notes, and a drink within reach before you begin.' },
  rain: { name: 'The rain room', caption: 'Let the outside world wait.', focus: 50, rest: 10, presets: [25, 50, 60], prompt: 'Behind the window', placeholder: 'A little uninterrupted reading', tip: 'Rain is optional. Choose a comfortable volume, then settle into one task.' },
  anime: { name: 'Between episodes', caption: 'A chapter now. An episode later.', focus: 40, rest: 20, presets: [40, 50, 60], prompt: 'Before the next episode', placeholder: 'Finish the practice questions', tip: 'Choose your episode before you study. Keep autoplay off during the break.' },
  stopwatch: { name: 'The study journal', caption: 'Make room for your own pace.', focus: 25, rest: 5, presets: [], prompt: 'Today I am learning', placeholder: 'A topic worth taking my time with', tip: 'Pause for interruptions. Finish when you reach a useful stopping point.' },
} satisfies Record<LocalTimerVariant, { name: string; caption: string; focus: number; rest: number; presets: number[]; prompt: string; placeholder: string; tip: string }>
