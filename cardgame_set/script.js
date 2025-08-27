class SetGame {
    constructor() {
        this.score = 0;
        this.playedCount = 0;
        this.giveUpCount = 0;
        this.maxGiveUps = 3;
        this.selectedIndices = [];
        this.cards = [];
        this.visibleCount = 12;
        this.freeze = false;
        
        this.initializeDeck();
        this.dealInitialCards();
        this.setupEventListeners();
        this.renderCards();
        this.updateUI();
    }
    
    initializeDeck() {
        const shapes = ['○', '△', '□'];
        const colors = ['red', 'green', 'blue'];
        const numbers = [1, 2, 3];
        const shadings = ['outline', 'striped', 'filled'];
        
        this.deck = [];
        for (let shape of shapes) {
            for (let color of colors) {
                for (let number of numbers) {
                    for (let shading of shadings) {
                        this.deck.push({ shape, color, number, shading });
                    }
                }
            }
        }
        
        this.shuffleDeck();
    }
    
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }
    
    dealInitialCards() {
        this.cards = this.deck.splice(0, 12);
    }
    
    setupEventListeners() {
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());
        document.getElementById('giveUpBtn').addEventListener('click', () => this.giveUp());
        document.getElementById('continueBtn').addEventListener('click', () => this.continueGame());
        document.getElementById('quitBtn').addEventListener('click', () => this.quitGame());
        
        // Modal close handlers
        document.querySelector('.close').addEventListener('click', () => this.closeHelp());
        window.addEventListener('click', (event) => {
            const helpModal = document.getElementById('helpModal');
            if (event.target === helpModal) {
                this.closeHelp();
            }
        });
    }
    
    renderCards() {
        const cardGrid = document.getElementById('cardGrid');
        cardGrid.innerHTML = '';
        
        // Create 21 card slots (7 columns × 3 rows)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 7; col++) {
                const cardIndex = this.getCardIndexFromPosition(row, col);
                const cardElement = document.createElement('div');
                cardElement.className = 'card';
                cardElement.dataset.index = cardIndex;
                
                if (col === 6) {
                    // Selected cards display column
                    cardElement.className += ' placeholder';
                } else if (cardIndex < this.cards.length) {
                    // Regular card
                    this.renderCardContent(cardElement, this.cards[cardIndex]);
                    cardElement.addEventListener('click', () => this.toggleSelect(cardIndex));
                } else {
                    // Empty slot
                    cardElement.className += ' empty';
                }
                
                cardGrid.appendChild(cardElement);
            }
        }
        
        this.updateSelectedDisplay();
    }
    
    getCardIndexFromPosition(row, col) {
        if (col < 4) {
            return row * 4 + col;
        } else if (col === 4) {
            return 12 + row;
        } else if (col === 5) {
            return 15 + row;
        } else if (col === 6) {
            return 18 + row;
        }
        return -1;
    }
    
    renderCardContent(cardElement, card) {
        const shapesContainer = document.createElement('div');
        shapesContainer.className = 'card-shapes';
        
        for (let i = 0; i < card.number; i++) {
            const shapeElement = document.createElement('div');
            shapeElement.className = `shape ${this.getShapeClass(card.shape)} ${card.color} ${card.shading}`;
            shapesContainer.appendChild(shapeElement);
        }
        
        cardElement.innerHTML = '';
        cardElement.appendChild(shapesContainer);
    }
    
    getShapeClass(shape) {
        switch (shape) {
            case '○': return 'circle';
            case '△': return 'triangle';
            case '□': return 'square';
            default: return 'circle';
        }
    }
    
    toggleSelect(cardIndex) {
        if (this.freeze || cardIndex >= this.cards.length) {
            return;
        }
        
        const selectedIndex = this.selectedIndices.indexOf(cardIndex);
        
        if (selectedIndex > -1) {
            // Unselect card
            this.selectedIndices.splice(selectedIndex, 1);
        } else {
            // Select card (if we have room)
            if (this.selectedIndices.length < 3) {
                this.selectedIndices.push(cardIndex);
            }
        }
        
        this.updateCardSelection();
        this.updateSelectedDisplay();
        
        if (this.selectedIndices.length === 3) {
            this.freeze = true;
            setTimeout(() => this.showResult(), 300);
        }
    }
    
    updateCardSelection() {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            const index = parseInt(card.dataset.index);
            if (this.selectedIndices.includes(index)) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });
    }
    
    updateSelectedDisplay() {
        for (let i = 0; i < 3; i++) {
            const selectedCard = document.getElementById(`selected${i}`);
            if (i < this.selectedIndices.length) {
                const card = this.cards[this.selectedIndices[i]];
                this.renderCardContent(selectedCard, card);
                selectedCard.style.backgroundColor = 'white';
            } else {
                selectedCard.innerHTML = '';
                selectedCard.style.backgroundColor = 'lightgray';
            }
        }
    }
    
    isValidSet(card1, card2, card3) {
        const properties = ['shape', 'color', 'number', 'shading'];
        const ruleDetails = {};
        let isValid = true;
        
        for (let prop of properties) {
            const values = [card1[prop], card2[prop], card3[prop]];
            const uniqueCount = new Set(values).size;
            
            if (uniqueCount === 1) {
                ruleDetails[prop] = { status: 'satisfied', type: 'all_same', values };
            } else if (uniqueCount === 3) {
                ruleDetails[prop] = { status: 'satisfied', type: 'all_different', values };
            } else {
                ruleDetails[prop] = { status: 'violated', type: 'mixed', values };
                isValid = false;
            }
        }
        
        return { isValid, ruleDetails };
    }
    
    formatRuleExplanation(ruleDetails, isWin) {
        let explanation = 'Rule Analysis:\n';
        
        const propertyNames = {
            'shape': 'Shape',
            'color': 'Color',
            'number': 'Number',
            'shading': 'Shading'
        };
        
        for (let [prop, details] of Object.entries(ruleDetails)) {
            const propName = propertyNames[prop];
            const { status, type, values } = details;
            
            if (status === 'satisfied') {
                if (type === 'all_same') {
                    explanation += `✓ ${propName}: All same (${values[0]})\n`;
                } else {
                    explanation += `✓ ${propName}: All different (${values.join(', ')})\n`;
                }
            } else {
                explanation += `✗ ${propName}: Mixed - not all same or all different (${values.join(', ')})\n`;
            }
        }
        
        if (isWin) {
            explanation += '\nAll 4 rules satisfied - Valid SET!';
        } else {
            const satisfiedCount = Object.values(ruleDetails).filter(d => d.status === 'satisfied').length;
            explanation += `\nOnly ${satisfiedCount}/4 rules satisfied - Invalid SET`;
        }
        
        return explanation;
    }
    
    showResult() {
        const selectedCards = this.selectedIndices.map(i => this.cards[i]);
        const { isValid, ruleDetails } = this.isValidSet(selectedCards[0], selectedCards[1], selectedCards[2]);
        
        this.playedCount++;
        
        let resultMsg;
        if (isValid) {
            this.score++;
            resultMsg = `You Win! 🎉\nScore: ${this.score}\n\n`;
        } else {
            this.score--;
            resultMsg = `You Lose! ❌\nScore: ${this.score}\n\n`;
        }
        
        resultMsg += this.formatRuleExplanation(ruleDetails, isValid);
        
        document.getElementById('resultTitle').textContent = 'Game Result';
        document.getElementById('resultMessage').textContent = resultMsg;
        document.getElementById('resultModal').style.display = 'block';
        
        this.updateUI();
    }
    
    continueGame() {
        document.getElementById('resultModal').style.display = 'none';
        
        // Remove selected cards (sort in reverse order to maintain indices)
        const sortedIndices = [...this.selectedIndices].sort((a, b) => b - a);
        for (let index of sortedIndices) {
            this.cards.splice(index, 1);
        }
        
        // Add replacement cards if needed (keep at least 12 cards if deck has cards)
        if (this.cards.length < 12 && this.deck.length > 0) {
            const needed = 12 - this.cards.length;
            const replacement = this.deck.splice(0, Math.min(needed, this.deck.length));
            this.cards.push(...replacement);
        }
        
        // Check for game over
        if (this.cards.length < 3 && this.deck.length === 0) {
            this.showGameOver();
            return;
        }
        
        this.selectedIndices = [];
        this.freeze = false;
        this.renderCards();
        this.updateUI();
    }
    
    quitGame() {
        document.getElementById('resultModal').style.display = 'none';
        alert('Thanks for playing SET!');
        location.reload();
    }
    
    showGameOver() {
        const finalMsg = `Game Over!\n\nFinal Score: ${this.score}\nRounds Played: ${this.playedCount}\n\nNo more cards available.`;
        alert(finalMsg);
        location.reload();
    }
    
    giveUp() {
        if (this.giveUpCount >= this.maxGiveUps || this.freeze || this.deck.length === 0) {
            return;
        }
        
        const extraCards = this.deck.splice(0, Math.min(3, this.deck.length));
        if (extraCards.length === 0) {
            alert('No more cards available in deck!');
            return;
        }
        
        this.cards.push(...extraCards);
        this.giveUpCount++;
        this.renderCards();
        this.updateUI();
    }
    
    updateUI() {
        document.getElementById('scoreLabel').textContent = `Score: ${this.score}`;
        document.getElementById('playedLabel').textContent = `Played: ${this.playedCount}`;
        
        const giveUpBtn = document.getElementById('giveUpBtn');
        const remaining = this.maxGiveUps - this.giveUpCount;
        giveUpBtn.textContent = `Give Up (${remaining} left)`;
        
        if (remaining <= 0 || this.deck.length === 0) {
            giveUpBtn.disabled = true;
        }
    }
    
    showHelp() {
        document.getElementById('helpModal').style.display = 'block';
    }
    
    closeHelp() {
        document.getElementById('helpModal').style.display = 'none';
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SetGame();
});