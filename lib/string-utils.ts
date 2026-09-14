export const APP_NAME = 'CodeBreaker';

export enum Route {
  Landing = '/',
  Dashboard = '/dashboard',
  Login = '/auth/login',
  SignUp = '/auth/sign-up',
  NewGame = '/game/new',
  GameDetails = '/game',
  Join = '/join',
  Room = '/room',
  Play = '/play',
}

export enum PuzzleMode {
  Sequential = 'Sequential',
  All = 'All',
}

export enum PuzzleType {
  Number = 'number',
  Text = 'text',
}

export enum GameStatus {
  Waiting = 'waiting',
  InProgress = 'in_progress',
  Finished = 'finished',
  Paused = 'paused',
}
