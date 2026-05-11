const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const btnStart = document.getElementById("btnStart");

const scoreElement = document.getElementById("score");
const roundElement = document.getElementById("round");
const timerDisplay = document.getElementById("timerDisplay");

const pokemonImage = document.getElementById("pokemonImage");
const pokemonName = document.getElementById("pokemonName");
const message = document.getElementById("message");

const assistMode = document.getElementById("assistMode");
const hardMode = document.getElementById("hardMode");
const autocompleteMode = document.getElementById("autocompleteMode");

const answerArea = document.getElementById("answerArea");
const answerInput = document.getElementById("answerInput");
const suggestions = document.getElementById("suggestions");
const btnAnswer = document.getElementById("btnAnswer");

const optionsGrid = document.getElementById("optionsGrid");
const btnNext = document.getElementById("btnNext");

const btnSound = document.getElementById("btnSound");
const btnMute = document.getElementById("btnMute");

const pokemonMode = document.getElementById("pokemonMode");
const gameTime = document.getElementById("gameTime");

/* ========================= */
/* ÁUDIOS */
/* ========================= */

const audioTema = new Audio("assets/sound/tema.mp3");
const audioPergunta = new Audio("assets/sound/pergunta.mp3");
const audioAcerto = new Audio("assets/sound/acerto.mp3");
const audioErro = new Audio("assets/sound/erro.mp3");
const audioFundo = new Audio("assets/sound/somfundo.mp3");

/* ========================= */
/* ESTADO DO JOGO */
/* ========================= */

let currentPokemon = null;
let pokemonNames = [];

let score = 0;
let round = 1;
let answered = false;
let gameOver = false;

let maxPokemonId = 151;

let soundEnabled = false;
let isMuted = false;

let nextRoundTimeout = null;
let nextRoundInterval = null;

let gameTimer = null;
let timeLeft = 0;

let isLoadingRound = false;

/* ========================= */
/* CONFIGURAÇÕES DE ÁUDIO */
/* ========================= */

audioTema.loop = true;
audioTema.volume = 0.18;

audioPergunta.volume = 0.45;

audioAcerto.volume = 0.4;

audioErro.volume = 0.18;

audioFundo.loop = false;
audioFundo.volume = 0.06;

/* ========================= */
/* EVENTOS */
/* ========================= */

btnStart.addEventListener("click", startGame);
btnAnswer.addEventListener("click", handleTextAnswer);
btnNext.addEventListener("click", nextRound);
btnMute.addEventListener("click", toggleMute);

btnSound.addEventListener("click", () => {
    if (soundEnabled) return;

    soundEnabled = true;

    audioTema.play().catch(() => { });

    btnSound.textContent = "🎵 Som Ativado";
    btnSound.classList.add("active-sound");
});

answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        handleTextAnswer();
    }
});

answerInput.addEventListener("input", showSuggestions);

document.addEventListener("click", (event) => {
    if (!answerArea.contains(event.target)) {
        hideSuggestions();
    }
});

/* ========================= */
/* LISTA DE NOMES */
/* ========================= */

loadPokemonNames();

async function loadPokemonNames() {
    try {
        const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
        const data = await response.json();

        pokemonNames = data.results.map((pokemon) => pokemon.name);
    } catch (error) {
        console.error("Não foi possível carregar a lista de nomes.", error);
    }
}

/* ========================= */
/* INICIAR JOGO */
/* ========================= */

async function startGame() {
    audioTema.pause();
    audioTema.currentTime = 0;

    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    score = 0;
    round = 1;
    answered = false;
    gameOver = false;

    maxPokemonId = Number(pokemonMode.value);

    btnNext.onclick = nextRound;
    btnNext.textContent = "Próximo Pokémon";
    btnNext.classList.add("hidden");

    updateScore();
    updateRound();
    startGameTimer();

    await loadPokemon();
}

/* ========================= */
/* TIMER DO DESAFIO */
/* ========================= */

function startGameTimer() {
    clearInterval(gameTimer);

    timeLeft = Number(gameTime.value);

    if (timeLeft === 0) {
        timerDisplay.textContent = "∞";
        return;
    }

    updateTimerDisplay();

    gameTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            finishGame();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    timerDisplay.textContent =
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/* ========================= */
/* CARREGAR POKÉMON */
/* ========================= */

async function loadPokemon() {
    if (isLoadingRound || gameOver) return;

    isLoadingRound = true;

    stopRoundSounds();

    answered = false;

    pokemonName.textContent = "Quem é esse Pokémon?";
    message.textContent = "Observe a silhueta e tente acertar!";
    message.className = "message";

    btnNext.classList.add("hidden");
    btnNext.textContent = "Próximo Pokémon";

    answerInput.value = "";
    answerInput.disabled = false;
    btnAnswer.disabled = false;
    hideSuggestions();

    optionsGrid.innerHTML = "";
    pokemonImage.style.display = "block";
    pokemonImage.src = "";
    pokemonImage.alt = "Silhueta do Pokémon";
    pokemonImage.className = "pokemon-img hidden-pokemon";

    audioFundo.pause();
    audioFundo.currentTime = 0;

    audioPergunta.pause();
    audioPergunta.currentTime = 0;

    setTimeout(() => {
        if (!gameOver && !answered) {
            audioPergunta.play().catch(() => { });
        }
    }, 120);

    audioPergunta.onended = () => {
        if (!gameOver && !answered) {
            audioFundo.currentTime = 0;
            audioFundo.play().catch(() => { });
        }
    };

    try {
        const randomId = Math.floor(Math.random() * maxPokemonId) + 1;
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);

        if (!response.ok) {
            throw new Error("Não foi possível buscar o Pokémon.");
        }

        currentPokemon = await response.json();

        const image =
            currentPokemon.sprites.other["official-artwork"].front_default ||
            currentPokemon.sprites.front_default;

        pokemonImage.src = image;

        if (assistMode.checked) {
            answerArea.classList.add("hidden");
            optionsGrid.classList.remove("hidden");
            await createOptions();
        } else {
            optionsGrid.classList.add("hidden");
            answerArea.classList.remove("hidden");
            answerInput.focus();
        }
    } catch (error) {
        message.textContent = "Ops! A Pokédex falhou. Tente novamente.";
        message.className = "message wrong";
        console.error(error);
    } finally {
        isLoadingRound = false;
    }
}

/* ========================= */
/* RESPOSTAS */
/* ========================= */

function handleTextAnswer() {
    if (answered || !currentPokemon || gameOver) return;

    const userAnswer = normalizeText(answerInput.value);
    const correctAnswer = normalizeText(currentPokemon.name);

    if (!userAnswer) {
        message.textContent = "Digite um nome antes de responder.";
        message.className = "message wrong";
        shakeCard();
        return;
    }

    checkAnswer(userAnswer === correctAnswer);
}

function checkAnswer(isCorrect) {
    if (gameOver) return;

    answered = true;

    stopRoundSounds();
    hideSuggestions();
    revealPokemon();

    if (isCorrect) {
        score += assistMode.checked ? 5 : 10;

        message.textContent = assistMode.checked
            ? "Acertou! Mesmo com ajuda, mandou bem!"
            : "Acertou! Você é praticamente um mestre Pokémon!";

        message.className = "message correct";

        playSuccessEffect();
    } else {
        message.textContent = `Quase! Era ${formatPokemonName(currentPokemon.name)}.`;
        message.className = "message wrong";

        shakeCard();
        playErrorEffect();
    }

    updateScore();

    answerInput.disabled = true;
    btnAnswer.disabled = true;
    disableOptions();

    btnNext.classList.remove("hidden");
    startNextRoundTimer();
}

function revealPokemon() {
    pokemonImage.classList.remove("hidden-pokemon");
    pokemonImage.classList.add("revealed-pokemon");

    const name = formatPokemonName(currentPokemon.name);

    pokemonName.textContent = name;
    pokemonImage.alt = name;
}

/* ========================= */
/* MÚLTIPLA ESCOLHA */
/* ========================= */

async function createOptions() {
    optionsGrid.innerHTML = "";

    if (!currentPokemon) return;

    const correctName = currentPokemon.name;
    const options = [correctName];

    const hardOptions = hardMode.checked
        ? await getHardOptionNames(correctName)
        : [];

    hardOptions.forEach((name) => {
        if (options.length < 4 && name && name !== correctName && !options.includes(name)) {
            options.push(name);
        }
    });

    while (options.length < 4) {
        const randomName = await getRandomPokemonName();

        if (randomName && randomName !== correctName && !options.includes(randomName)) {
            options.push(randomName);
        }
    }

    shuffleArray(options);

    options.forEach((name) => {
        const button = document.createElement("button");

        button.className = "option-btn";
        button.textContent = formatPokemonName(name);

        button.addEventListener("click", () => {
            if (answered || gameOver) return;

            markSelectedOption(button, name === correctName);
            checkAnswer(name === correctName);
        });

        optionsGrid.appendChild(button);
    });
}

async function getHardOptionNames(correctName) {
    const options = [];

    options.push(...getSimilarNames(correctName));

    try {
        const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${correctName}`);
        const species = await speciesResponse.json();

        const chainResponse = await fetch(species.evolution_chain.url);
        const chain = await chainResponse.json();

        const evolutionNames = extractEvolutionNames(chain.chain)
            .filter((name) => name !== correctName);

        options.push(...evolutionNames);
    } catch (error) {
        console.warn("Não foi possível buscar cadeia evolutiva.", error);
    }

    return [...new Set(options)];
}

function getSimilarNames(correctName) {
    if (!pokemonNames.length) return [];

    const prefix3 = correctName.slice(0, 3);
    const prefix4 = correctName.slice(0, 4);

    return pokemonNames
        .filter((name) =>
            name !== correctName &&
            (
                name.startsWith(prefix3) ||
                name.includes(prefix4) ||
                name.charAt(0) === correctName.charAt(0)
            )
        )
        .slice(0, 12);
}

function extractEvolutionNames(chainNode) {
    const names = [];

    function walk(node) {
        if (!node) return;

        names.push(node.species.name);

        node.evolves_to.forEach((child) => walk(child));
    }

    walk(chainNode);

    return names;
}

async function getRandomPokemonName() {
    if (pokemonNames.length) {
        const limit = Math.min(maxPokemonId, pokemonNames.length);
        const index = Math.floor(Math.random() * limit);
        return pokemonNames[index];
    }

    const randomId = Math.floor(Math.random() * maxPokemonId) + 1;
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
    const pokemon = await response.json();

    return pokemon.name;
}

function markSelectedOption(selectedButton, isCorrect) {
    const buttons = document.querySelectorAll(".option-btn");

    buttons.forEach((button) => {
        const buttonName = normalizeText(button.textContent);
        const correctName = normalizeText(currentPokemon.name);

        if (buttonName === correctName) {
            button.classList.add("correct-option");
        } else if (button === selectedButton && !isCorrect) {
            button.classList.add("wrong-option");
        } else {
            button.classList.add("disabled-option");
        }
    });
}

function disableOptions() {
    const buttons = document.querySelectorAll(".option-btn");

    buttons.forEach((button) => {
        button.disabled = true;
    });
}

/* ========================= */
/* AUTOCOMPLETE */
/* ========================= */

function showSuggestions() {
    if (!autocompleteMode.checked || assistMode.checked || gameOver || answered) {
        hideSuggestions();
        return;
    }

    const value = normalizeText(answerInput.value);

    if (!value || value.length < 1 || !pokemonNames.length) {
        hideSuggestions();
        return;
    }

    const limit = Math.min(maxPokemonId, pokemonNames.length);

    const filtered = pokemonNames
        .slice(0, limit)
        .filter((name) => name.startsWith(value))
        .slice(0, 6);

    if (!filtered.length) {
        hideSuggestions();
        return;
    }

    suggestions.innerHTML = "";

    filtered.forEach((name) => {
        const item = document.createElement("button");

        item.type = "button";
        item.className = "suggestion-item";
        item.textContent = formatPokemonName(name);

        item.addEventListener("click", () => {
            answerInput.value = formatPokemonName(name);
            hideSuggestions();
            answerInput.focus();
        });

        suggestions.appendChild(item);
    });

    suggestions.classList.remove("hidden");
}

function hideSuggestions() {
    suggestions.innerHTML = "";
    suggestions.classList.add("hidden");
}

/* ========================= */
/* PRÓXIMA RODADA */
/* ========================= */

async function nextRound() {
    if (gameOver || isLoadingRound) return;

    clearTimeout(nextRoundTimeout);
    clearInterval(nextRoundInterval);

    stopRoundSounds();

    round++;
    updateRound();

    await loadPokemon();
}

function startNextRoundTimer() {
    clearTimeout(nextRoundTimeout);
    clearInterval(nextRoundInterval);

    let countdown = 5;

    btnNext.textContent = `Próximo Pokémon (${countdown})`;

    nextRoundInterval = setInterval(() => {
        countdown--;

        if (countdown > 0) {
            btnNext.textContent = `Próximo Pokémon (${countdown})`;
        } else {
            clearInterval(nextRoundInterval);
        }
    }, 1000);

    nextRoundTimeout = setTimeout(() => {
        nextRound();
    }, 5000);
}

/* ========================= */
/* FIM / REINÍCIO */
/* ========================= */

function finishGame() {
    gameOver = true;

    clearInterval(gameTimer);
    clearTimeout(nextRoundTimeout);
    clearInterval(nextRoundInterval);

    stopRoundSounds();
    hideSuggestions();

    pokemonImage.classList.remove("hidden-pokemon");
    pokemonImage.classList.remove("revealed-pokemon");
    pokemonImage.src = "";
    pokemonImage.alt = "";
    pokemonImage.style.display = "none";

    pokemonName.textContent = "Tempo esgotado!";

    message.innerHTML = `
        <div class="end-card">
            <span>🏆 Pontuação final: <strong>${score}</strong></span>
            <span>🎮 Rodadas jogadas: <strong>${round}</strong></span>
            <span>Deseja tentar novamente?</span>
        </div>
    `;

    message.className = "message correct";

    answerInput.disabled = true;
    btnAnswer.disabled = true;
    optionsGrid.innerHTML = "";

    btnNext.classList.remove("hidden");
    btnNext.textContent = "Voltar ao início";
    btnNext.onclick = resetToStart;
}

function resetToStart() {
    clearInterval(gameTimer);
    clearTimeout(nextRoundTimeout);
    clearInterval(nextRoundInterval);

    stopRoundSounds();
    hideSuggestions();

    score = 0;
    round = 1;
    answered = false;
    gameOver = false;

    updateScore();
    updateRound();

    timerDisplay.textContent = "∞";

    gameScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");

    btnNext.onclick = nextRound;
    btnNext.textContent = "Próximo Pokémon";
    btnNext.classList.add("hidden");

    pokemonName.textContent = "Quem é esse Pokémon?";
    message.textContent = "Observe a silhueta e tente acertar!";
    message.className = "message";

    pokemonImage.src = "";
    pokemonImage.alt = "Silhueta do Pokémon";
    pokemonImage.className = "pokemon-img hidden-pokemon";

    optionsGrid.innerHTML = "";
    answerInput.value = "";
    answerInput.disabled = false;
    btnAnswer.disabled = false;

    if (soundEnabled && !isMuted) {
        audioTema.currentTime = 0;
        audioTema.play().catch(() => { });
    }
}

/* ========================= */
/* ÁUDIO */
/* ========================= */

function stopRoundSounds() {
    audioPergunta.pause();
    audioPergunta.currentTime = 0;

    audioAcerto.pause();
    audioAcerto.currentTime = 0;

    audioErro.pause();
    audioErro.currentTime = 0;

    audioFundo.pause();
    audioFundo.currentTime = 0;
}

function toggleMute() {
    isMuted = !isMuted;

    const audios = [
        audioTema,
        audioPergunta,
        audioAcerto,
        audioErro,
        audioFundo
    ];

    audios.forEach((audio) => {
        audio.muted = isMuted;
    });

    btnMute.textContent = isMuted ? "🔇 Som" : "🔊 Som";
}

/* ========================= */
/* EFEITOS VISUAIS */
/* ========================= */

function playSuccessEffect() {
    audioAcerto.currentTime = 0;
    audioAcerto.play().catch(() => { });

    const card = document.querySelector(".pokemon-card");

    card.classList.remove("success-flash");
    pokemonImage.classList.add("pokemon-glow-success");

    setTimeout(() => {
        card.classList.add("success-flash");
    }, 10);

    setTimeout(() => {
        pokemonImage.classList.remove("pokemon-glow-success");
    }, 1200);
}

function playErrorEffect() {
    audioErro.currentTime = 0;
    audioErro.play().catch(() => { });

    const card = document.querySelector(".pokemon-card");

    card.classList.remove("error-flash");
    pokemonImage.classList.add("pokemon-glow-error");

    setTimeout(() => {
        card.classList.add("error-flash");
    }, 10);

    setTimeout(() => {
        pokemonImage.classList.remove("pokemon-glow-error");
    }, 1200);
}

function shakeCard() {
    const card = document.querySelector(".pokemon-card");

    card.classList.remove("shake");

    setTimeout(() => {
        card.classList.add("shake");
    }, 10);
}

/* ========================= */
/* HELPERS */
/* ========================= */

function updateScore() {
    scoreElement.textContent = score;
}

function updateRound() {
    roundElement.textContent = round;
}

function normalizeText(text) {
    return text
        .toLowerCase()
        .trim()
        .replaceAll(" ", "-");
}

function formatPokemonName(name) {
    return name
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function shuffleArray(array) {
    array.sort(() => Math.random() - 0.5);
}
