export type Language = 'en' | 'he';

export interface Translations {
  appName: string;
  room: string;
  code: string;
  players: string;
  score: string;
  pts: string;
  leave: string;
  createGame: string;
  joinGame: string;
  nickname: string;
  enterNickname: string;
  roomCode: string;
  enterRoomCode: string;
  gameSettings: string;
  rounds: string;
  roundDuration: string;
  seconds: string;
  customTemplatePack: string;
  uploadZipPack: string;
  uploadingZip: string;
  zipTemplatesCount: string;
  useOnlyCustomTemplates: string;
  createLobby: string;
  joinLobby: string;
  gameLobby: string;
  waitingForPlayers: string;
  host: string;
  you: string;
  startGame: string;
  needMorePlayers: string;
  round: string;
  of: string;
  memeCreationPhase: string;
  chooseTemplate: string;
  randomTemplate: string;
  active: string;
  typeCaption: string;
  selectedCaptionText: string;
  fontSize: string;
  outlineThickness: string;
  textColor: string;
  fontStyle: string;
  addText: string;
  deleteText: string;
  lockInMeme: string;
  submittingMeme: string;
  memeLockedIn: string;
  waitingForArchitects: string;
  submittedCount: string;
  liveShowcase: string;
  meme: string;
  downloadMeme: string;
  createdBy: string;
  yourMeme: string;
  castYourVote: string;
  like: string;
  meh: string;
  dislike: string;
  yourVoteRecorded: string;
  votesCast: string;
  voted: string;
  roundResults: string;
  roundWinner: string;
  nextRound: string;
  finalLeaderboard: string;
  gameWinner: string;
  runnerUp: string;
  thirdPlace: string;
  playAgain: string;
  returnHome: string;
  dragCaptionsHint: string;
  serverSettings: string;
  serverUrl: string;
  connectionStatus: string;
  connected: string;
  disconnected: string;
  testConnection: string;
  saveAndReconnect: string;
  serverSettingsDesc: string;
  capacitorNotice: string;
  assignedMemeTemplate: string;
  phaseLoadingStarting: string;
  phaseLoadingCreationTitle: string;
  phaseLoadingCreationSub: string;
  phaseLoadingVotingTitle: string;
  phaseLoadingVotingSub: string;
  phaseLoadingResultsTitle: string;
  phaseLoadingResultsSub: string;
  phaseLoadingFinalTitle: string;
  phaseLoadingFinalSub: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'Meme Battle',
    room: 'ROOM',
    code: 'CODE',
    players: 'Players',
    score: 'Score',
    pts: 'pts',
    leave: 'Leave',
    createGame: 'CREATE GAME',
    joinGame: 'JOIN GAME',
    nickname: 'Your Nickname',
    enterNickname: 'Enter your meme architect name',
    roomCode: 'Room Code',
    enterRoomCode: 'Enter 4-letter room code',
    gameSettings: 'Game Settings',
    rounds: 'Total Rounds',
    roundDuration: 'Creation Time (seconds)',
    seconds: 'sec',
    customTemplatePack: 'Custom Meme Template Pack (ZIP)',
    uploadZipPack: 'Upload ZIP File with Images',
    uploadingZip: 'Extracting ZIP Images...',
    zipTemplatesCount: 'Templates loaded from ZIP',
    useOnlyCustomTemplates: 'Use exclusively uploaded ZIP templates',
    createLobby: 'CREATE MEME LOBBY',
    joinLobby: 'JOIN MEME BATTLE',
    gameLobby: 'GAME LOBBY',
    waitingForPlayers: 'Waiting for players to join...',
    host: 'HOST',
    you: 'YOU',
    startGame: 'START BATTLE NOW',
    needMorePlayers: 'Need at least 2 players to start',
    round: 'ROUND',
    of: 'OF',
    memeCreationPhase: 'MEME CREATION PHASE',
    chooseTemplate: 'CHOOSE MEME TEMPLATE',
    randomTemplate: 'RANDOM TEMPLATE',
    active: 'Active',
    typeCaption: 'Type caption...',
    selectedCaptionText: 'Selected Caption Text',
    fontSize: 'Font Size',
    outlineThickness: 'Outline Thickness',
    textColor: 'Text Color',
    fontStyle: 'Font Style',
    addText: 'Text',
    deleteText: 'Delete',
    lockInMeme: 'LOCK IN & SUBMIT MEME',
    submittingMeme: 'SUBMITTING MEME...',
    memeLockedIn: 'YOUR MEME IS LOCKED IN!',
    waitingForArchitects: 'Waiting for other meme architects to finish...',
    submittedCount: 'SUBMITTED',
    liveShowcase: 'LIVE SHOWCASE & VOTING',
    meme: 'MEME',
    downloadMeme: 'Download Meme',
    createdBy: 'CREATED BY',
    yourMeme: 'YOU (YOUR MEME)',
    castYourVote: 'CAST YOUR VOTE',
    like: 'LIKE (+200)',
    meh: 'MEH (0)',
    dislike: 'DISLIKE (-200)',
    yourVoteRecorded: 'Your vote is recorded!',
    votesCast: 'VOTES CAST:',
    voted: 'Voted',
    roundResults: 'ROUND RESULTS',
    roundWinner: 'TOP VOTED MEME THIS ROUND',
    nextRound: 'NEXT ROUND',
    finalLeaderboard: 'FINAL BATTLE LEADERBOARD',
    gameWinner: 'ULTIMATE MEME CHAMPION',
    runnerUp: 'RUNNER UP',
    thirdPlace: 'THIRD PLACE',
    playAgain: 'PLAY AGAIN',
    returnHome: 'RETURN TO HOME',
    dragCaptionsHint: 'Tap & Drag captions to position on meme canvas',
    serverSettings: 'Server Connection Settings',
    serverUrl: 'Backend Server URL',
    connectionStatus: 'Connection Status',
    connected: 'Connected',
    disconnected: 'Disconnected',
    testConnection: 'Test Connection',
    saveAndReconnect: 'Save & Reconnect',
    serverSettingsDesc: 'Configure the game server URL to host or join rooms from mobile APKs or external networks.',
    capacitorNotice: 'When running as an Android APK via Capacitor, make sure this points to your active server URL (e.g., https://your-meme-game.run.app).',
    assignedMemeTemplate: 'YOUR ASSIGNED MEME TEMPLATE',
    phaseLoadingStarting: 'PREPARING NEXT PHASE...',
    phaseLoadingCreationTitle: 'Round {round} is Starting!',
    phaseLoadingCreationSub: 'Assigning secret meme templates... Get your wit ready!',
    phaseLoadingVotingTitle: 'Time\'s Up! Showcase & Voting!',
    phaseLoadingVotingSub: 'Gathering all submitted memes... Get ready to vote!',
    phaseLoadingResultsTitle: 'Tallying the Votes!',
    phaseLoadingResultsSub: 'Calculating scores and determining the round winner...',
    phaseLoadingFinalTitle: 'Battle Completed!',
    phaseLoadingFinalSub: 'Preparing the final podium and declaring the ultimate Meme Champion...'
  },
  he: {
    appName: 'קרב הממים',
    room: 'חדר',
    code: 'קוד',
    players: 'שחקנים',
    score: 'ניקוד',
    pts: 'נק׳',
    leave: 'יציאה',
    createGame: 'צור משחק',
    joinGame: 'הצטרף למשחק',
    nickname: 'כינוי',
    enterNickname: 'הכנס את הכינוי שלך',
    roomCode: 'קוד חדר',
    enterRoomCode: 'הכנס קוד חדר (4 אותיות)',
    gameSettings: 'הגדרות משחק',
    rounds: 'מספר סיבובים',
    roundDuration: 'זמן ליצירת מם (בשניות)',
    seconds: 'שניות',
    customTemplatePack: 'חבילת תבניות ממים מותאמת (קובץ ZIP)',
    uploadZipPack: 'העלה קובץ ZIP עם תמונות',
    uploadingZip: 'מחלץ תמונות מה-ZIP...',
    zipTemplatesCount: 'תבניות הועלו מקובץ ZIP',
    useOnlyCustomTemplates: 'השתמש אך ורק בתבניות ה-ZIP שהועלו',
    createLobby: 'צור לובי משחק',
    joinLobby: 'הצטרף לקרב הממים',
    gameLobby: 'לובי המשחק',
    waitingForPlayers: 'ממתין להצטרפות שחקנים...',
    host: 'מארח',
    you: 'אתה',
    startGame: 'התחל את הקרב עכשיו',
    needMorePlayers: 'דרושים לפחות 2 שחקנים להתחלה',
    round: 'סיבוב',
    of: 'מתוך',
    memeCreationPhase: 'שלב יצירת המם',
    chooseTemplate: 'בחר תבנית מם',
    randomTemplate: 'תבנית אקראית',
    active: 'פעיל',
    typeCaption: 'קלד כיתוב...',
    selectedCaptionText: 'טקסט הכיתוב הנבחר',
    fontSize: 'גודל גופן',
    outlineThickness: 'עובי מסגרת',
    textColor: 'צבע טקסט',
    fontStyle: 'סגנון גופן',
    addText: 'טקסט',
    deleteText: 'מחק',
    lockInMeme: 'נעול ושלח מם',
    submittingMeme: 'שולח מם...',
    memeLockedIn: 'המם שלך ננעל בהצלחה!',
    waitingForArchitects: 'ממתין ליוצרי הממים האחרים שיסיימו...',
    submittedCount: 'נשלחו',
    liveShowcase: 'הצגה חי והצבעות',
    meme: 'מם',
    downloadMeme: 'הורד מם',
    createdBy: 'נוצר על ידי',
    yourMeme: 'אתה (המם שלך)',
    castYourVote: 'הצבע עכשיו',
    like: 'אהבתי (+200)',
    meh: 'ככה ככה (0)',
    dislike: 'לא אהבתי (-200)',
    yourVoteRecorded: 'הצבעתך נרשמה!',
    votesCast: 'הצבעות שנרשמו:',
    voted: 'הצביעו',
    roundResults: 'תוצאות הסיבוב',
    roundWinner: 'המם המוביל בסיבוב הזה',
    nextRound: 'לסיבוב הבא',
    finalLeaderboard: 'טבלת הניקוד הסופית',
    gameWinner: 'אלוף הממים הגדול',
    runnerUp: 'מקום שני',
    thirdPlace: 'מקום שלישי',
    playAgain: 'שחק שוב',
    returnHome: 'חזור לדף הבית',
    dragCaptionsHint: 'לחץ וגרור את הכיתובים על גבי המם',
    serverSettings: 'הגדרות חיבור לשרת',
    serverUrl: 'כתובת שרת המשחק',
    connectionStatus: 'סטטוס חיבור',
    connected: 'מחובר',
    disconnected: 'מנותק',
    testConnection: 'בדיקת חיבור',
    saveAndReconnect: 'שמור והתחבר מחדש',
    serverSettingsDesc: 'הגדר את כתובת השרת כדי לארח או להצטרף לחדרים מתוך אפליקציית אנדרואיד (APK) או מרשתות חיצוניות.',
    capacitorNotice: 'כשמפעילים כאפליקציית אנדרואיד (APK), ודא שכתובת זו מצביעה לשרת הפעיל שלך (למשל: https://your-meme-game.run.app).',
    assignedMemeTemplate: 'תבנית המם שיועדה לך',
    phaseLoadingStarting: 'מעביר שלב...',
    phaseLoadingCreationTitle: 'סיבוב {round} מתחיל!',
    phaseLoadingCreationSub: 'משבץ תבניות ממים סודיות... הכינו את ההומור!',
    phaseLoadingVotingTitle: 'נגמר הזמן! שלב ההצגה וההצבעה!',
    phaseLoadingVotingSub: 'אוסף את כל הממים שנשלחו... היכונו להצביע!',
    phaseLoadingResultsTitle: 'מחשב את הניקוד!',
    phaseLoadingResultsSub: 'סופר את הקולות מכל השחקנים וקובע את המנצח...',
    phaseLoadingFinalTitle: 'הקרב הסתיים!',
    phaseLoadingFinalSub: 'מכין את פודיום הניצחון ומכריז על אלוף הממים הגדול...'
  }
};

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.en;
}
