function submitRecommendation() {
    // Simulate submitting a recommendation and showing the popup
    document.getElementById('popup').classList.add('visible');
    setTimeout(() => {
        document.getElementById('popup').classList.remove('visible');
    }, 3000);
}
