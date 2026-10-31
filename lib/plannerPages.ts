import type { SeoSlug } from './seoRoutes'
import type { PlannerMode } from './studyPlanner'

export const plannerSlugs = ['exam-study-planner', 'weekly-study-planner', 'exam-revision-planner', 'pomodoro-calculator'] as const
export type PlannerSlug = typeof plannerSlugs[number]

export const plannerLabels: Record<PlannerSlug, string> = {
  'exam-study-planner': 'Exam Study Planner',
  'weekly-study-planner': 'Weekly Study Planner',
  'exam-revision-planner': 'Exam Revision Planner',
  'pomodoro-calculator': 'Pomodoro Calculator',
}

interface PlannerPage {
  mode: PlannerMode
  title: string
  description: string
  heading: string
  intro: string
  cta: string
  explanationHeading: string
  explanation: string[]
  stepsHeading: string
  steps: string[]
  templatesHeading: string
  templates: { title: string; text: string }[]
  tipsHeading: string
  tips: { title: string; text: string }[]
  faq: { question: string; answer: string }[]
  related: SeoSlug[]
  finalHeading: string
  finalCopy: string
}

export const plannerPages: Record<PlannerSlug, PlannerPage> = {
  'exam-study-planner': {
    mode: 'exam',
    title: 'Exam Study Planner — Free Pomodoro Study Plan | Pomo Cowork',
    description: 'Enter your exam, exam date, and daily study hours. Get a free Pomodoro study plan with daily 25-minute focus blocks and breaks. Download your schedule.',
    heading: 'Exam Study Planner',
    intro: 'An exam ahead. A little time each day. Turn your deadline into a ready-to-use Pomodoro plan, with a clear number of focus sessions for each day.',
    cta: 'Create my study plan',
    explanationHeading: 'From “I need to study” to a plan for today',
    explanation: [
      'An exam date tells you when to be ready. This exam study planner gives the time before it a structure. Enter the name of your exam, its date, and the hours you can set aside each day. Your schedule starts today and ends the day before the exam.',
      'Each study day contains complete 25-minute Pomodoros with five-minute breaks between them. The plan uses your daily availability, including breaks, and shows any minutes left over. It never schedules a partial focus block or adds study time on exam day.',
      'Each day shows numbered Pomodoros, ready for you to use. Choose the topics and questions from your own course materials. The planner allocates time without inventing tasks or assigning a syllabus.',
    ],
    stepsHeading: 'Make your exam plan in three steps',
    steps: [
      'Name your exam and choose its date, from tomorrow to 90 days from today.',
      'Enter your available hours per day, including breaks. Every day before the exam is included.',
      'Create your plan, browse the daily blocks, and download the full schedule. Select a Pomodoro in your plan, then press Start focus in the timer on this page.',
    ],
    templatesHeading: 'What your study time looks like',
    templates: [
      { title: '30 minutes a day', text: 'One 25-minute focus block and five spare minutes. Choose one concrete task, such as recalling a definition or checking a short question set. There is no scheduled break after your final block.' },
      { title: '1 hour a day', text: 'Two Pomodoros give you 50 minutes of focus with a five-minute break between them. Five minutes stay free for setup or a next-step note. Across seven study days, that is 14 focused sessions.' },
      { title: '2 hours a day', text: 'Four Pomodoros give you 100 minutes of focus, three five-minute breaks, and five spare minutes. Across 14 study days, that is 56 sessions and 23 hours 20 minutes of focused preparation.' },
    ],
    tipsHeading: 'Give each block a useful job',
    tips: [
      { title: 'Build understanding', text: 'Use a Pomodoro to review material and explain it without notes. Choose the chapters that need attention.' },
      { title: 'Practice and apply', text: 'Use a Pomodoro for practice questions and checking answers. For a timed mock, follow your exam provider’s timing rather than splitting it into Pomodoros.' },
      { title: 'Review weak spots', text: 'Set aside a Pomodoro for mistakes and difficult ideas when you need it. You decide which sessions to use for review.' },
    ],
    faq: [
      { question: 'How does the exam study planner work?', answer: 'Enter an exam name, exam date, and daily hours. The planner fits 25-minute focus blocks and five-minute breaks into each day from today until the day before your exam. Each block is labelled as a numbered Pomodoro; you choose what to study.' },
      { question: 'Are the hours per day or the total for the whole plan?', answer: 'The hours are your available time each day, including short breaks. Every day is included. For example, two hours a day gives you four 25-minute focus sessions and three five-minute breaks each day, with five minutes left over.' },
      { question: 'Does it include the exam day?', answer: 'No. The plan ends the day before your exam. You can choose an exam date from tomorrow to 90 days from today. Dates follow your browser’s local calendar day.' },
      { question: 'Will it choose the topics for my exam?', answer: 'No. The exam name labels your plan. The schedule contains numbered Pomodoros without assigned tasks. Use your syllabus and practice results to choose specific topics. The plan does not assess readiness or guarantee a grade.' },
      { question: 'Can I skip weekends or change the Pomodoro length?', answer: 'This quick planner uses every day and a fixed 25-minute focus / five-minute break rhythm. Use the linked Exam Revision Planner for selected weekdays, specific topics, session estimates, and custom durations.' },
      { question: 'Can I save my exam study plan?', answer: 'Yes. Download the full schedule as a text file, including every day and study block. Your inputs, schedule, completed Pomodoros, and timer state also save automatically in this browser when local storage is available. A running timer accounts for time spent away. No account is needed, and plans do not sync between devices.' },
      { question: 'Are long breaks included?', answer: 'No. The plan counts five-minute breaks only between focus blocks, with no break after the last block. Reserve meals and longer breaks outside the daily hours you enter.' },
    ],
    related: ['study-timer-for-exams', '25-5-pomodoro', 'active-recall-timer'],
    finalHeading: 'Your next step can be just 25 minutes',
    finalCopy: 'Name the exam. Set aside the time. Give today a place in your preparation.',
  },

  'weekly-study-planner': {
    mode: 'weekly',
    title: 'Weekly Study Planner — Free Schedule & Templates | Pomo Cowork',
    description: 'Build a weekly study schedule from your subjects, available days, and Pomodoro sessions. Try a template, save your plan locally, and start your first study block.',
    heading: 'A weekly study planner that leaves room for breaks',
    intro: 'Bring your subjects and the time you actually have. Turn them into a week of manageable study sessions, then start with one clear task.',
    cta: 'Plan my study week',
    explanationHeading: 'Build your week around the time you have',
    explanation: [
      'A weekly study plan connects a list of assignments to a limited number of hours. Begin with commitments you already know: classes, work, meals, travel, and time away from studying. The minutes you enter here are the time left for study and breaks on each selected day. You can leave busy days out of the schedule.',
      'Give each subject or task a name and an estimated number of focus sessions. “Biology: cell structure questions” is easier to act on than “Biology.” A session is a time estimate, not a promise to finish a topic. After trying the first day, use what you learned about the workload to update the inputs and generate a new plan.',
      'The planner fits complete focus sessions into your available days and counts the short breaks between sessions. If your requested work does not fit, the result shows the remaining sessions. Use that information to reduce the scope, make more time, or move work to another week before treating the timetable as a commitment.',
    ],
    stepsHeading: 'Make a usable weekly timetable',
    steps: [
      'Choose your start and end dates, then select the weekdays you can study. Both dates are included.',
      'Set one daily time budget for the selected days, including short breaks.',
      'Add specific topics and estimate how many focus sessions each needs.',
      'Build the plan and check what fits. Choose Prepare next session, then Start focus when you are ready.',
    ],
    templatesHeading: 'Three ways to plan a study week',
    templates: [
      { title: 'Balanced school week', text: 'Start with mathematics practice, science questions, and a reading assignment. Give each two sessions across five available weekdays. At 25 minutes per session with five-minute breaks, a 60-minute daily window fits two sessions in 55 minutes. Use the remaining room for an assignment that takes longer than expected.' },
      { title: 'Reading and writing week', text: 'Separate reading, outlining, drafting, and editing into named tasks. For a short assignment, try two reading sessions, one outline session, three drafting sessions, and one editing session as an initial estimate. Adjust the counts after reading the brief; the planner schedules your estimates rather than evaluating the assignment.' },
      { title: 'A lighter catch-up week', text: 'Pick the two or three unfinished tasks that matter most. Choose fewer available days and keep the session estimates small. If the result has spare capacity, you do not have to fill it: leave it for catch-up work, feedback, or a longer break.' },
    ],
    tipsHeading: 'Keep the plan useful during the week',
    tips: [
      { title: 'Name the next action', text: 'Write “solve questions 1–8” or “outline the introduction” so the first session has a visible starting point.' },
      { title: 'Check the estimate', text: 'After completing a block, compare the work done with the sessions you expected to need. Change future estimates when the difference is meaningful.' },
      { title: 'Keep a copy', text: 'Your plan saves automatically when browser storage is available. You can also download its schedule as CSV or print it. A local save stays on this device and browser.' },
    ],
    faq: [
      { question: 'How do I make a weekly study schedule?', answer: 'Choose start and end dates, select your available weekdays, and enter a daily time budget. Both dates are included. Add each subject or task with the number of focus sessions you expect to need. Build the schedule and review any work that does not fit before using it for the week.' },
      { question: 'Does the daily study time include breaks?', answer: 'Yes. The daily budget includes focus sessions and the short breaks between them. There is no extra break after the last session of a day. Longer breaks, meals, and other commitments should be left outside the time you enter.' },
      { question: 'Can I edit a weekly study plan?', answer: 'Yes. Change the topics, session counts, dates, available days, or durations and generate a new plan. Regenerating replaces the previous schedule and its completion checklist, so export the old plan first if you want to keep a separate record.' },
      { question: 'Can I use the study planner without an account?', answer: 'Yes. You can build a plan, start its local session timer, and mark sessions complete without signing in. Your plan saves automatically when browser storage is available. It does not sync between devices or appear in account session history.' },
      { question: 'What if my subjects need more time than the week allows?', answer: 'The result shows how many requested sessions remain unscheduled. You can increase the daily time budget, add available days, reduce the work planned for this week, or extend the end date. The planner supports a date range of up to 90 days.' },
    ],
    related: ['study-timer', 'homework-timer', 'pomodoro-for-students'],
    finalHeading: 'Give the next study session a place in your week',
    finalCopy: 'Start with your real availability. A plan you can follow begins with time you can actually use.',
  },
  'exam-revision-planner': {
    mode: 'exam',
    title: 'Exam Revision Planner — Free Study Timetable | Pomo Cowork',
    description: 'Make an exam revision timetable from your revision deadline, topics, and available study days. Plan focus sessions with breaks, check capacity, and export your schedule.',
    heading: 'An exam revision planner for the days you have left',
    intro: 'List the topics, practice work, and mistakes you want to revisit. Fit your estimated sessions into the days before your exam and see what still needs time.',
    cta: 'Plan my revision',
    explanationHeading: 'Turn the revision list into a realistic timetable',
    explanation: [
      'Use your exam timetable to choose the last day you can revise, then turn the syllabus into concrete work. Your course materials and exam guidance help you decide what belongs on the list. Add specific tasks such as “algebra: mixed questions,” “biology: explain cell transport,” or “review mistakes from practice paper 1.”',
      'Set a starting date, a last revision day, and the weekdays you can study. Both dates are included, so choose the day before the exam if that is your final study day. Estimate the sessions each task needs and choose a daily time budget that includes breaks. The planner shows which complete sessions fit into those days and which remain unscheduled.',
      'Review the result against your own knowledge of the material. The timetable can organize the workload you enter, but it cannot tell whether you understand a concept or whether an estimate is enough. After a practice set, update the topic list and session counts to reflect the questions that still need work.',
    ],
    stepsHeading: 'Plan the work before exam day',
    steps: [
      'Enter your starting date and last revision day, usually the day before your exam. Both dates are included.',
      'List topic work, practice questions, and mistake review as separate tasks.',
      'Choose available weekdays, estimate sessions for each task, and set a daily budget including breaks.',
      'Build the timetable and review unscheduled work. Choose Prepare next session, then Start focus.',
    ],
    templatesHeading: 'Revision templates you can adapt to your syllabus',
    templates: [
      { title: 'Topics, practice, and mistake review', text: 'Start with two sessions for a difficult topic, two for practice questions, and one for checking mistakes. Replace those labels with the specific chapter and question set you will use. Give mistake review its own entry so it has a place in the plan instead of being left for spare time.' },
      { title: 'The final two weeks', text: 'List the remaining topic gaps first, then add question sets and review of previous errors. Estimate how many sessions each task needs and compare the total with the available days. Keep exam-day preparation outside the study budget, and make room for the practical arrangements you already know about.' },
      { title: 'Several subjects, one study window', text: 'Include the subject in each task name, such as “Chemistry: bonding questions” and “History: essay outline.” Choose a last revision day before the earliest relevant exam. Export this plan before replacing it with one for later exams if their available study days or workload differ.' },
    ],
    tipsHeading: 'Use the timetable alongside evidence from your work',
    tips: [
      { title: 'Separate practice from review', text: 'Finishing a question set and understanding its errors are different tasks. Give each a session estimate when both are needed.' },
      { title: 'Revisit the workload', text: 'When a practice session reveals a gap, add a specific follow-up task and regenerate the timetable using your remaining availability.' },
      { title: 'Keep exam timing separate', text: 'These are revision blocks. For a timed mock, follow the instructions and section lengths from your exam provider.' },
    ],
    faq: [
      { question: 'How do I make a revision timetable before an exam?', answer: 'Enter the date you will start and your last revision day, usually the day before the exam. Both dates are included. Choose study weekdays and a daily time budget, then list the topics and practice tasks with estimated session counts. The planner fits sessions into those selected days and shows any work that remains unscheduled.' },
      { question: 'Does the planner choose the topics I need to revise?', answer: 'You choose the topics and session estimates. Use your syllabus, teacher guidance, and practice results to decide what needs work. The timetable organizes the tasks you enter; it does not check syllabus coverage or measure your understanding.' },
      { question: 'Can I plan revision for more than one exam?', answer: 'You can include several subjects in one plan by naming the subject in each task. The plan has one last revision day. Choose a date before the earliest relevant exam for a shared plan. Export the current plan before replacing it with a separate timetable for later exams.' },
      { question: 'What happens when there is not enough study time?', answer: 'The result keeps the daily time limit and reports the sessions that could not be scheduled. Review your priorities and estimates, increase available time where realistic, or reduce the work in this plan. The planner does not silently extend the deadline or squeeze extra work into a full day.' },
      { question: 'Does this create a spaced repetition schedule?', answer: 'No. It schedules the tasks and session counts you provide within your available study days. If you want to return to a topic, add the review work to your list and check the generated dates yourself. It does not calculate memory-based review intervals.' },
      { question: 'Can I print or save the revision timetable?', answer: 'Yes. You can print the generated timetable or download it as CSV. The plan and its completion checklist save automatically when browser storage is available. Local saves stay on this device and do not sync with your Pomo Cowork account.' },
    ],
    related: ['study-timer-for-exams', 'active-recall-timer', 'exam-timer'],
    finalHeading: 'Start with the revision you can name',
    finalCopy: 'A chapter, a question set, a page of mistakes. Give each a time estimate and see how the plan fits.',
  },
  'pomodoro-calculator': {
    mode: 'calculator',
    title: 'Pomodoro Calculator — Sessions, Breaks & Total Time | Pomo Cowork',
    description: 'Calculate how many Pomodoro sessions fit into your available time, including short breaks. Adjust focus and break lengths, then start a session from your plan.',
    heading: 'A Pomodoro calculator for the time you have',
    intro: 'Enter your available minutes and choose a focus-and-break rhythm. See the complete sessions that fit, the time spent on breaks, and the minutes left over.',
    cta: 'Calculate my sessions',
    explanationHeading: 'Count focus time and breaks together',
    explanation: [
      'Dividing two hours by 25 minutes misses the breaks between sessions. This calculator treats your time as one window: complete focus sessions, a short break between each pair, and any minutes left over. It does not add a break after the final session or insert longer breaks automatically.',
      'With 120 available minutes, 25-minute focus sessions, and five-minute breaks, you can fit four sessions. That is 100 minutes of focus plus three breaks totaling 15 minutes: 115 minutes in all, with five minutes left over. A fifth full session would not fit in the same window.',
      'The calculation is floor((available minutes + break minutes) / (focus minutes + break minutes)). This counts only complete sessions and includes breaks between them. If you have less time than one focus session, the result has no sessions. Choose a shorter session or a larger time window before starting.',
    ],
    stepsHeading: 'Calculate a study window',
    steps: [
      'Enter the total minutes available, including short breaks.',
      'Choose the length of a focus session and the break between sessions.',
      'Calculate the plan and check the focus, break, and remaining time.',
      'Choose Prepare next session, then Start focus. Between sessions, prepare and start the planned break when you are ready.',
    ],
    templatesHeading: 'Three practical time-budget examples',
    templates: [
      { title: 'Two hours at 25 / 5', text: 'Four 25-minute sessions plus three five-minute breaks use 115 of your 120 minutes. That leaves five minutes for setting up or writing a next-step note. A break after the fourth session is outside this calculation.' },
      { title: 'One hour at 25 / 5', text: 'Two focus sessions use 50 minutes and the one break between them uses five. The schedule takes 55 minutes, leaving five minutes free. A third session would need 85 minutes in total.' },
      { title: 'Two hours at 50 / 10', text: 'Two 50-minute sessions with one ten-minute break use 110 minutes. The remaining ten minutes are spare time. Choose the interval that fits your task and adjust the settings before generating the schedule.' },
    ],
    tipsHeading: 'Read the result as a time budget',
    tips: [
      { title: 'Focus time', text: 'The number of complete sessions multiplied by the focus duration. This is the planned time on the task, not a prediction of how much work you will finish.' },
      { title: 'Break time', text: 'One short break between consecutive sessions. There are three breaks for four sessions, and no break is needed for a single session.' },
      { title: 'Time left', text: 'The minutes remaining after the planned sessions and breaks. Keep them free or adjust the interval; the calculator does not turn them into a partial focus session.' },
    ],
    faq: [
      { question: 'How many Pomodoros fit in two hours?', answer: 'With 25 minutes of focus and five-minute breaks, four complete Pomodoros fit in two hours. Four sessions take 100 minutes and the three breaks between them take 15 minutes, leaving five of the 120 minutes unused.' },
      { question: 'Does the calculator include a break after the last session?', answer: 'No. It counts breaks only between focus sessions. If you want a final break inside the same time window, subtract that break from your available minutes before calculating.' },
      { question: 'Does the calculator add a long break after four Pomodoros?', answer: 'No. It uses the same short-break length between all sessions. Reserve longer breaks outside the time you enter, or calculate separate study windows on either side of a longer break.' },
      { question: 'Can I calculate sessions longer or shorter than 25 minutes?', answer: 'Yes. Change the focus and break durations before calculating. For example, two 50-minute sessions and one ten-minute break take 110 minutes. The calculator uses the durations you enter rather than requiring a fixed 25/5 rhythm.' },
      { question: 'Why does the result have time left over?', answer: 'Only complete focus sessions fit into the schedule. If the remaining minutes are not enough for the next break and focus session, they stay unused. You can keep that margin for setup or choose a shorter focus duration.' },
      { question: 'Can I start a timer from the calculated schedule?', answer: 'Yes. Choose Prepare next session or the play control beside a session, then press Start focus. Completing the countdown checks off that session. Leaving the page resets its timer. You can also mark sessions complete manually, print the plan, or export it as CSV. The plan saves automatically when browser storage is available; it does not sync with account session history.' },
    ],
    related: ['pomodoro-timer', '25-5-pomodoro', '50-10-pomodoro'],
    finalHeading: 'Make the next hour easier to use',
    finalCopy: 'Choose your time window, account for the breaks, and start one complete focus session.',
  },
}
