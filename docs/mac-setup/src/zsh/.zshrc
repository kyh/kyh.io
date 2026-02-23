# =============================================================================
# Zsh Configuration
# =============================================================================

# History
HISTFILE=~/.zsh_history
HISTSIZE=50000
SAVEHIST=50000
setopt SHARE_HISTORY HIST_IGNORE_DUPS HIST_IGNORE_SPACE

# PATH
typeset -U path
path=(
  "$HOME/Library/pnpm"
  "$HOME/.bun/bin"
  /opt/homebrew/bin
  "$HOME/.local/bin"
  $path
)

# Oh My Zsh
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"
plugins=(git)
source "$ZSH/oh-my-zsh.sh"

# Editor (change EDITOR_CMD to switch between zed/cursor)
export EDITOR_CMD="zed"
export EDITOR="$EDITOR_CMD --wait"
export VISUAL="$EDITOR"

# Completions
autoload -Uz compinit && compinit

# Tools
eval "$(/opt/homebrew/bin/brew shellenv)"
command -v fnm &>/dev/null && eval "$(fnm env --use-on-cd)"
command -v zoxide &>/dev/null && eval "$(zoxide init zsh)"
command -v fzf &>/dev/null && source <(fzf --zsh)
[[ -f ~/.cargo/env ]] && . ~/.cargo/env
[[ -s ~/.bun/_bun ]] && source ~/.bun/_bun

# Plugins
source /opt/homebrew/share/zsh-autosuggestions/zsh-autosuggestions.zsh 2>/dev/null
source /opt/homebrew/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh 2>/dev/null

# Aliases
alias cat='bat --no-pager'
alias ls='eza --icons=always'
alias s='source ~/.zshrc'
alias pu="pnpm dlx taze -r -w"
alias pi="pnpm install"
alias pd="pnpm dev"
alias po="pnpm outdated -r"
alias pupi="pu && pnpm install"
alias pup="pu && pnpm install && git commit -a -m 'chore: update packages' && git push"
pupa() {
  local projects=(
    dataembed
    edgestories
    init
    inteligir
    kyh/ai-canvas
    kyh/ai-datagrid
    kyh/kyh.io
    loremllm
    uicapsule
    vibedgames
    yours-sincerely
  )
  printf '%s\n' "${projects[@]}" | xargs -P4 -I{} sh -c \
    'cd ~/Documents/Projects/{} && pnpm dlx taze -r -w && pnpm install && git commit -a -m "chore: update packages" && git push'
}

# c: open or create file/dir in editor
c() {
  if [[ $# -eq 0 ]]; then $EDITOR_CMD .; return; fi
  [[ ! -e "$1" ]] && { [[ "$1" == *.* ]] && touch "$1" || mkdir -p "$1"; }
  $EDITOR_CMD "$@"
}

# cc: claude with skip permissions
cc() { claude --dangerously-skip-permissions "$@"; }

# =============================================================================
# Git AI Helpers
# =============================================================================

_git_claude_commit() {
  local type="$1"
  local diff_output
  if git diff --cached --quiet 2>/dev/null; then
    diff_output=$(git diff)
  else
    diff_output=$(git diff --cached)
  fi
  [[ -z "$diff_output" ]] && { echo "No changes to commit" >&2; return 1; }

  local changed_files
  if git diff --cached --quiet 2>/dev/null; then
    changed_files=$(git diff --name-only)
  else
    changed_files=$(git diff --cached --name-only)
  fi

  local prompt="Analyze these git changes and generate a conventional commit message.

Commit type: $type
Changed files:
$changed_files

Git diff:
\`\`\`
$diff_output
\`\`\`

Respond with ONLY a JSON object in this exact format (no other text):
{\"message\": \"brief description of changes\"}

The message should be a concise description in lowercase, no period at the end."

  local response
  response=$(claude --dangerously-skip-permissions --model haiku -p "$prompt" 2>/dev/null)
  local cleaned_response=$(echo "$response" | sed 's/```json//g; s/```//g')
  local single_line=$(echo "$cleaned_response" | tr '\n' ' ')

  local json_match
  json_match=$(echo "$single_line" | awk '
    BEGIN { in_json=0; brace_count=0; json="" }
    {
      for (i=1; i<=length($0); i++) {
        char = substr($0, i, 1)
        if (char == "{") {
          if (brace_count == 0) { in_json = 1; json = char }
          else { json = json char }
          brace_count++
        } else if (char == "}") {
          json = json char
          brace_count--
          if (brace_count == 0 && in_json) { print json; exit }
        } else if (in_json) { json = json char }
      }
    }
  ')

  local message
  if command -v jq &>/dev/null && [[ -n "$json_match" ]]; then
    message=$(echo "$json_match" | jq -r '.message // "update"' 2>/dev/null)
  else
    message=$(echo "$json_match" | sed -n 's/.*"message"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
    [[ -z "$message" ]] && message="update"
  fi

  [[ -z "$message" ]] && { echo "Failed to parse Claude response" >&2; return 1; }
  echo "$message"
}

_git_claude_infer_type() {
  local diff_output
  if git diff --cached --quiet 2>/dev/null; then
    diff_output=$(git diff)
  else
    diff_output=$(git diff --cached)
  fi
  [[ -z "$diff_output" ]] && { echo "No changes to commit" >&2; return 1; }

  local changed_files
  if git diff --cached --quiet 2>/dev/null; then
    changed_files=$(git diff --name-only)
  else
    changed_files=$(git diff --cached --name-only)
  fi

  local prompt="Analyze these git changes and determine the appropriate conventional commit type and message.

Changed files:
$changed_files

Git diff:
\`\`\`
$diff_output
\`\`\`

Use these commit type definitions:
- feat: new feature for the user
- fix: bug fix for the user
- docs: changes to documentation
- style: formatting, no production code change
- refactor: refactoring production code
- test: adding/refactoring tests
- chore: updating build tasks etc

Respond with ONLY a JSON object in this exact format (no other text):
{\"type\": \"feat\", \"message\": \"brief description of changes\"}

The message should be a concise description in lowercase, no period at the end."

  local response
  response=$(claude --dangerously-skip-permissions --model haiku -p "$prompt" 2>/dev/null)
  local cleaned_response=$(echo "$response" | sed 's/```json//g; s/```//g')
  local single_line=$(echo "$cleaned_response" | tr '\n' ' ')

  local json_match
  json_match=$(echo "$single_line" | awk '
    BEGIN { in_json=0; brace_count=0; json="" }
    {
      for (i=1; i<=length($0); i++) {
        char = substr($0, i, 1)
        if (char == "{") {
          if (brace_count == 0) { in_json = 1; json = char }
          else { json = json char }
          brace_count++
        } else if (char == "}") {
          json = json char
          brace_count--
          if (brace_count == 0 && in_json) { print json; exit }
        } else if (in_json) { json = json char }
      }
    }
  ')

  local type message
  if command -v jq &>/dev/null && [[ -n "$json_match" ]]; then
    type=$(echo "$json_match" | jq -r '.type // "chore"' 2>/dev/null)
    message=$(echo "$json_match" | jq -r '.message // "update"' 2>/dev/null)
  else
    type=$(echo "$json_match" | sed -n 's/.*"type"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
    message=$(echo "$json_match" | sed -n 's/.*"message"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
    [[ -z "$type" ]] && type="chore"
    [[ -z "$message" ]] && message="update"
  fi

  [[ -z "$type" || -z "$message" ]] && { echo "Failed to parse Claude response" >&2; return 1; }
  echo "$type|$message"
}

fix() { local msg; msg=$(_git_claude_commit "fix") || return 1; git add . && git commit -m "fix: $msg" && git push; }
feat() { local msg; msg=$(_git_claude_commit "feat") || return 1; git add . && git commit -m "feat: $msg" && git push; }
push() { local r; r=$(_git_claude_infer_type) || return 1; local t="${r%%|*}" m="${r#*|}"; git add . && git commit -m "$t: $m" && git push; }

branch() {
  [ -d .git ] || { echo "Not a git repo."; return 1; }
  local animals=(
    "aardvark" "albatross" "alligator" "alpaca" "ant" "anteater" "antelope" "ape" "armadillo"
    "baboon" "badger" "barracuda" "bat" "bear" "beaver" "bee" "bison" "boar" "buffalo" "butterfly"
    "camel" "capybara" "caribou" "cassowary" "cat" "caterpillar" "cattle" "chamois" "cheetah" "chicken"
    "chimpanzee" "chinchilla" "chough" "clam" "cobra" "cockroach" "cod" "cormorant" "coyote" "crab"
    "crane" "crocodile" "crow" "curlew" "deer" "dinosaur" "dog" "dogfish" "dolphin" "donkey"
    "dotterel" "dove" "dragonfly" "duck" "dugong" "dunlin" "eagle" "echidna" "eel" "eland"
    "elephant" "elk" "emu" "falcon" "ferret" "finch" "fish" "flamingo" "fly" "fox"
    "frog" "gaur" "gazelle" "gerbil" "giraffe" "gnat" "gnu" "goat" "goldfinch" "goldfish"
    "goose" "gorilla" "goshawk" "grasshopper" "grouse" "guanaco" "gull" "hamster" "hare" "hawk"
    "hedgehog" "heron" "herring" "hippopotamus" "hornet" "horse" "human" "hummingbird" "hyena" "ibex"
    "ibis" "jackal" "jaguar" "jay" "jellyfish" "kangaroo" "kingfisher" "koala" "kookaburra" "kouprey"
    "kudu" "lapwing" "lark" "lemur" "leopard" "lion" "llama" "lobster" "locust" "loris"
    "louse" "lyrebird" "magpie" "mallard" "manatee" "mandrill" "mantis" "marten" "meerkat" "mink"
    "mole" "mongoose" "monkey" "moose" "mosquito" "mouse" "mule" "narwhal" "newt" "nightingale"
    "octopus" "okapi" "opossum" "oryx" "ostrich" "otter" "owl" "oyster" "panther" "parrot"
    "partridge" "peafowl" "pelican" "penguin" "pheasant" "pig" "pigeon" "pony" "porcupine" "porpoise"
    "quail" "quelea" "quetzal" "rabbit" "raccoon" "rail" "ram" "rat" "raven" "red-deer"
    "red-panda" "reindeer" "rhinoceros" "rook" "ruff" "salamander" "salmon" "sandpiper" "sardine" "scorpion"
    "seahorse" "seal" "shark" "sheep" "shrew" "shrimp" "skunk" "snail" "snake" "sparrow"
    "spider" "spoonbill" "squid" "squirrel" "starling" "stingray" "stinkbug" "stork" "swallow" "swan"
    "tapir" "tarsier" "termite" "tiger" "toad" "trout" "turkey" "turtle" "viper" "vulture"
    "wallaby" "walrus" "wasp" "weasel" "whale" "wildcat" "wolf" "wolverine" "wombat" "woodcock"
    "woodpecker" "worm" "wren" "yak" "zebra"
  )
  local animal="${animals[$((RANDOM % ${#animals[@]} + 1))]}"
  local branch_name="kyh/$animal"
  if git show-ref --verify --quiet "refs/heads/$branch_name"; then
    echo "Branch $branch_name exists. Checking out..."
    git checkout "$branch_name"
  else
    echo "Creating branch: $branch_name"
    git checkout -b "$branch_name"
  fi
}
