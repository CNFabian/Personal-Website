document.getElementById('recommendationForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const message = document.getElementById('message').value;

    if (name && message) {
        const recommendationSection = document.getElementById('recommendations');
        
        const newRecommendation = document.createElement('div');
        newRecommendation.className = 'recommendation';
        newRecommendation.innerHTML = `<h4><i>${name}</i></h4>
                <p><i>${message}</i></p>`;
        
        recommendationSection.insertBefore(newRecommendation, recommendationSection.querySelector('.recommendation-form'));
        
        document.getElementById('recommendationForm').reset();
        submitRecommendation();
    }
});

function submitRecommendation() {
    // Simulate submitting a recommendation and showing the popup
    document.getElementById('popup').classList.add('visible');
    setTimeout(() => {
        document.getElementById('popup').classList.remove('visible');
    }, 3000);
}
