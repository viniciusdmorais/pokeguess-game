const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");
const btnStart = document.getElementById("btnStart");

const scoreElement = document.getElementById("score");
const roundElement = document.getElementById("round");

const pokemonImage = document.getElementById("pokemonImage");
const pokemonName = document.getElementById("pokemonName");
const message = document.getElementById("message");

const assistMode = document.getElementById("assistMode");
const answerArea = document.getElementById("answerArea");
const answerInput = document.getElementById("answerInput");
const btnAnswer = document.getElementById("btnAnswer");

const optionsGrid = document.getElementById("optionsGrid");
const btnNext = document.getElementById("btnNext");

/* ========================= */
/* ÁUDIOS */
/* ========================= */

const btnSound = document.getElementById("btnSound");
const audioTema = new Audio("assets/sound/tema.mp3");
const audioPergunta = new Audio("assets/sound/pergunta.mp3");
const audioAcerto = new Audio("assets/sound/acerto.mp3");
const audioErro = new Audio("assets/sound/erro.mp3");
const audioFundo = new Audio("assets/sound/somfundo.mp3");

let currentPokemon = null;
let score = 0;
let round = 1;
let answered = false;

const pokemonMode = document.getElementById("pokemonMode");

let maxPokemonId = 151;

/* CONFIGURAÇÕES */

audioTema.loop = true;
audioTema.volume = 0.18;

audioPergunta.volume = 0.45;

audioAcerto.volume = 0.4;

audioErro.volume = 0.18;

audioFundo.loop = false;
audioFundo.volume = 0.06;

btnStart.addEventListener("click", startGame);
btnAnswer.addEventListener("click", handleTextAnswer);
btnNext.addEventListener("click", nextRound);

pokemonMode.addEventListener("change", async () => {

    maxPokemonId = Number(pokemonMode.value);

    score = 0;
    round = 1;

    updateScore();
    updateRound();

    await loadPokemon();

});

answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        handleTextAnswer();
    }
});

assistMode.addEventListener("change", () => {
    if (assistMode.checked) {
        answerArea.classList.add("hidden");
        optionsGrid.classList.remove("hidden");

        if (currentPokemon && !answered) {
            createOptions();
        }
    } else {
        optionsGrid.classList.add("hidden");
        answerArea.classList.remove("hidden");
        answerInput.focus();
    }
});

async function startGame() {
    audioTema.pause();
    audioTema.currentTime = 0;

    //audioFundo.play().catch(() => { });

    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    score = 0;
    round = 1;

    updateScore();
    updateRound();

    await loadPokemon();
}

async function loadPokemon() {
    stopRoundSounds();
    
    answered = false;

    pokemonName.textContent = "Quem é esse Pokémon?";
    message.textContent = "Observe a silhueta e tente acertar!";
    message.className = "message";

    btnNext.classList.add("hidden");
    answerInput.value = "";
    answerInput.disabled = false;
    btnAnswer.disabled = false;
    optionsGrid.innerHTML = "";

    pokemonImage.src = "";
    pokemonImage.alt = "Silhueta do Pokémon";
    pokemonImage.className = "pokemon-img hidden-pokemon";
    //audioPergunta.currentTime = 0;
    //audioPergunta.play().catch(() => { });
    audioPergunta.currentTime = 0;

    audioPergunta.play().catch(() => { });

    /* inicia som de fundo depois da pergunta */

    audioPergunta.onended = () => {

        audioFundo.currentTime = 0;

        audioFundo.play().catch(() => { });
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
    }
}

function handleTextAnswer() {
    if (answered || !currentPokemon) return;

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
    answered = true;

    revealPokemon();

    if (isCorrect) {

        score += assistMode.checked ? 5 : 10;

        message.textContent = assistMode.checked
            ? "Acertou! Mesmo com ajuda, mandou bem!"
            : "Acertou! Você é praticamente um mestre Pokémon!";

        message.className = "message correct";

        playSuccessEffect();

    } else {

        message.textContent =
            `Quase! Era ${formatPokemonName(currentPokemon.name)}.`;

        message.className = "message wrong";

        shakeCard();

        playErrorEffect();
    }

    updateScore();

    answerInput.disabled = true;
    btnAnswer.disabled = true;
    disableOptions();

    btnNext.classList.remove("hidden");
}

function revealPokemon() {
    pokemonImage.classList.remove("hidden-pokemon");
    pokemonImage.classList.add("revealed-pokemon");

    const name = formatPokemonName(currentPokemon.name);

    pokemonName.textContent = name;
    pokemonImage.alt = name;
}

async function createOptions() {
    optionsGrid.innerHTML = "";

    const correctName = currentPokemon.name;
    const options = [correctName];

    while (options.length < 4) {
        const randomId = Math.floor(Math.random() * maxPokemonId) + 1;
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        const pokemon = await response.json();

        if (!options.includes(pokemon.name)) {
            options.push(pokemon.name);
        }
    }

    shuffleArray(options);

    options.forEach((name) => {
        const button = document.createElement("button");
        button.className = "option-btn";
        button.textContent = formatPokemonName(name);

        button.addEventListener("click", () => {
            if (answered) return;

            markSelectedOption(button, name === correctName);
            checkAnswer(name === correctName);
        });

        optionsGrid.appendChild(button);
    });
}

function disableOptions() {
    const buttons = document.querySelectorAll(".option-btn");

    buttons.forEach((button) => {
        button.disabled = true;
    });
}

async function nextRound() {
    stopRoundSounds();

    round++;
    updateRound();

    await loadPokemon();
}

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

function shakeCard() {
    const card = document.querySelector(".pokemon-card");

    card.classList.remove("shake");

    setTimeout(() => {
        card.classList.add("shake");
    }, 10);
}

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

/* ========================= */
/* INICIAR TEMA */
/* ========================= */

/* ========================= */
/* ATIVAR SOM */
/* ========================= */

let soundEnabled = false;

btnSound.addEventListener("click", () => {

    if (soundEnabled) return;

    soundEnabled = true;

    audioTema.play().catch(() => { });

    btnSound.textContent = "🎵 Som Ativado";

    btnSound.classList.add("active-sound");

});

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