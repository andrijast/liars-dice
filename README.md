
# Liar's Dice Game

[Liar's Dice](/Game%20rules.md) game simulator and API for building AI's (bots) to compete among themselves.


## Creating a bot

To create your player bot, follow the [API spec](/Bot%20API%20spec.md) or check some preset bots in `/bots` directory.


## Running a simulation

First, make sure you have `git` and `deno` installed. Then you can clone this repo to get started

```bash
git clone git@github.com:andrijast/liars-dice
cd liars-dice
```

Now use this command to start the server

```bash
deno run --allow-net ./server/index.ts [number_of_players=2] [number_of_dice=6] [number_of_games=1] [port=5533]
```

Or just use `run.sh` script

```bash
./run.sh [number_of_players=2] [number_of_dice=6] [number_of_games=1] [port=5533]
```

### Quick start a simulation

After running the server, to run a quick test simulation with bare simple bots, run:

```bash
node bots & node bots
```

## ToDo

- [ ] Add time limit to replies
- [ ] Allow players to provide names
- [ ] Handle player disconnet peacefully

Feel free to use `Issues` and `Pull requests` to contribute.
