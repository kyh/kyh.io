# New Mac Setup Guide

## Install Homebrew first
/bin/bash -c "$(curl -fsSL
https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

#### Essential formulas
brew install git gh zsh-autosuggestions zsh-syntax-highlighting fzf zoxide bat eza duti
brew install fnm uv
brew install ffmpeg turso
brew install claude-code codex gemini-cli

## Applications
- Editors: Zed (primary), Cursor
- Dev Tools: Claude, OrbStack, Fork, Android Studio, Xcode
- Browsers: Chrome
- Design: Figma
- Productivity: Raycast, CleanShot X, Screen Studio, Spokenly
- Communication: Slack, Discord, Linear, Zoom, Typefully
- Entertainment: Spotify

## Shell Setup
- oh-my-zsh - Framework

## Global npm packages
- npm i -g vercel eas-cli opensrc agent-browser

## Config to transfer
- ~/.zshrc - shell config
- ~/.gitconfig - git config
- ~/.claude/ - Claude config
- ~/.config/zed/ - editor config
- ~/.config/gh/ - GitHub CLI auth
