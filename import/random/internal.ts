// JetX Internal System (NotEs)

type GameCategory = "action" | "puzzle" | "racing" | "idle" | "arcade";

interface Game {
  id: number;
  name: string;
  category: GameCategory;
  rating: number;
  plays: number;
  isNew?: boolean;
}

interface UserProfile {
  username: string;
  favoriteGames: Game[];
  lastPlayed?: Game;
  preferences: {
    darkMode: boolean;
    soundEnabled: boolean;
  };
}

class GameLibrary {
  private games: Game[] = [];

  constructor(initialGames: Game[]) {
    this.games = initialGames;
  }

  addGame(game: Game): void {
    this.games.push(game);
  }

  removeGame(id: number): void {
    this.games = this.games.filter(g => g.id !== id);
  }

  getTopGames(limit: number = 10): Game[] {
    return [...this.games]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }

  getByCategory(category: GameCategory): Game[] {
    return this.games.filter(g => g.category === category);
  }
}

class UserSystem {
  private users: UserProfile[] = [];

  register(user: UserProfile): void {
    this.users.push(user);
  }

  findUser(username: string): UserProfile | undefined {
    return this.users.find(u => u.username === username);
  }

  updatePreferences(username: string, prefs: Partial<UserProfile["preferences"]>): void {
    const user = this.findUser(username);
    if (user) {
      user.preferences = { ...user.preferences, ...prefs };
    }
  }
}

// Utility functions

function generateRandomGames(count: number): Game[] {
  const categories: GameCategory[] = ["action", "puzzle", "racing", "idle", "arcade"];
  const games: Game[] = [];

  for (let i = 0; i < count; i++) {
    games.push({
      id: i,
      name: `Game ${i}`,
      category: categories[i % categories.length],
      rating: Math.random() * 5,
      plays: Math.floor(Math.random() * 10000),
      isNew: Math.random() > 0.8
    });
  }

  return games;
}

function simulateHeavyComputation(iterations: number): number {
  let result = 0;

  for (let i = 0; i < iterations; i++) {
    result += Math.sqrt(i) * Math.sin(i);
  }

  return result;
}



const library = new GameLibrary(generateRandomGames(100));

const userSystem = new UserSystem();

userSystem.register({
  username: "user",
  favoriteGames: library.getTopGames(5),
  preferences: {
    darkMode: true,
    soundEnabled: false
  }
});

// Simulated processes

function backgroundTasks(): void {
  setInterval(() => {
    const random = Math.random();

    if (random > 0.7) {
      library.addGame({
        id: Date.now(),
        name: "New Generated Game",
        category: "arcade",
        rating: Math.random() * 5,
        plays: 0,
        isNew: true
      });
    }

    simulateHeavyComputation(1000);
  }, 5000);
}


class AnalyticsTracker {
  private logs: string[] = [];

  log(event: string): void {
    const timestamp = new Date().toISOString();
    this.logs.push(`[${timestamp}] ${event}`);
  }

  getLogs(): string[] {
    return this.logs;
  }

  clear(): void {
    this.logs = [];
  }
}

const analytics = new AnalyticsTracker();

analytics.log("System initialized");
analytics.log("Games loaded");
analytics.log("User registered");

backgroundTasks();

export function getSystemStatus() {
  return {
    games: library.getTopGames(3),
    logs: analytics.getLogs().length,
    uptime: performance.now()
  };
}
