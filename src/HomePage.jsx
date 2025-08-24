import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

function HomePage() {
  return (
    <>
      <header className="header">
        <h1>Universal Platform In The World</h1>
        <nav>
          <Link to="/auth">Курсы</Link>
          <Link to="/auth">Профиль</Link>
          <Link to="#about">О нас</Link>
          <Link to="#contact">контакты</Link>
        </nav>
      </header>
      <div className="container">
        <div className="inner-container">
          <section className="hero">
            <div className="hero-content">
              <h2>О нашей платформе</h2>
              <p>
                бла бла бла бла бла бла
              </p>
              <button>
                Начать
                <svg className="arrow-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </section>
        </div>
      </div>
      <footer className="footer">
        <span className="copyright">© 2025 Наша компания.</span>
      </footer>
    </>
  );
}

export default HomePage;