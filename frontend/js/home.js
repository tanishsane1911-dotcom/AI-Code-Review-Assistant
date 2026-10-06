/*=========================================
        SCROLL ANIMATIONS
==========================================*/

// Add scroll reveal animation to elements

const observerOptions = {

    threshold: 0.1,

    rootMargin: '0px 0px -50px 0px'

};

const observer = new IntersectionObserver(function(entries) {

    entries.forEach(entry => {

        if (entry.isIntersecting) {

            entry.target.classList.add('active');

        }

    });

}, observerOptions);

document.addEventListener("DOMContentLoaded", function () {

    // Observe feature cards

    const featureCards = document.querySelectorAll('.feature-card');

    featureCards.forEach((card, index) => {

        card.style.animationDelay = `${index * 0.1}s`;

        observer.observe(card);

    });

    // Observe workflow cards

    const workflowCards = document.querySelectorAll('.workflow-card');

    workflowCards.forEach((card, index) => {

        card.style.animationDelay = `${index * 0.1}s`;

        observer.observe(card);

    });

    // Observe testimonial cards

    const testimonialCards = document.querySelectorAll('.testimonial-card');

    testimonialCards.forEach((card, index) => {

        card.style.animationDelay = `${index * 0.1}s`;

        observer.observe(card);

    });

    // Observe stat boxes

    const statBoxes = document.querySelectorAll('.stat-box');

    statBoxes.forEach((box, index) => {

        box.style.animationDelay = `${index * 0.1}s`;

        observer.observe(box);

    });

    /*=====================================
            STICKY HEADER
    =====================================*/

    const header = document.querySelector(".header");

    window.addEventListener("scroll", () => {

        if(window.scrollY > 50){

            header.classList.add("scrolled");

        }

        else{

            header.classList.remove("scrolled");

        }

    });

    /*=====================================
            MOBILE MENU
    =====================================*/

    const menuBtn = document.querySelector(".menu-toggle");

    const navMenu = document.querySelector(".nav-menu");

    if(menuBtn){

        menuBtn.addEventListener("click",()=>{

            navMenu.classList.toggle("active");

        });

    }

    /*=====================================
            SMOOTH SCROLL
    =====================================*/

    document.querySelectorAll('a[href^="#"]').forEach(anchor=>{

        anchor.addEventListener("click",function(e){

            e.preventDefault();

            const target =
            document.querySelector(this.getAttribute("href"));

            if(target){

                const headerOffset = 80;

                const elementPosition = target.getBoundingClientRect().top;

                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({

                    top: offsetPosition,

                    behavior: "smooth"

                });

            }

        });

    });

    /*=====================================
            COUNTER ANIMATION
    =====================================*/

    const counters =
    document.querySelectorAll(".stat-box h2");

    counters.forEach(counter=>{

        const text = counter.innerText;

        const number =
        parseInt(text.replace(/\D/g,""));

        if(isNaN(number)) return;

        const suffix =
        text.replace(/[0-9]/g,"");

        let count = 0;

        const speed = 30;

        function updateCounter(){

            if(count < number){

                count += Math.ceil(number/50);

                if(count > number){

                    count = number;

                }

                counter.innerText = count + suffix;

                setTimeout(updateCounter,speed);

            }

            else{

                counter.innerText = number + suffix;

            }

        }

        // Start counter when in view

        const counterObserver = new IntersectionObserver((entries) => {

            entries.forEach(entry => {

                if(entry.isIntersecting){

                    updateCounter();

                    counterObserver.unobserve(entry.target);

                }

            });

        });

        counterObserver.observe(counter);

    });

    /*=====================================
            CARD HOVER EFFECTS
    =====================================*/

    const cards =
    document.querySelectorAll(".feature-card,.workflow-card,.testimonial-card");

    cards.forEach(card=>{

        card.addEventListener("mouseenter",()=>{

            card.style.transform = "translateY(-8px)";

        });

        card.addEventListener("mouseleave",()=>{

            card.style.transform = "translateY(0px)";

        });

    });

    /*=====================================
            PARALLAX EFFECT FOR FLOATING ELEMENTS
    =====================================*/

    const floatingElements = document.querySelectorAll('.floating-element');

    window.addEventListener('scroll', () => {

        const scrolled = window.pageYOffset;

        floatingElements.forEach((element, index) => {

            const speed = (index + 1) * 0.5;

            element.style.transform = `translateY(${scrolled * speed}px)`;

        });

    });

});