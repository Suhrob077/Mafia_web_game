import React from 'react';
import '../i18n'
import { useTranslation } from 'react-i18next';
import './About.css';

const About = () => {
  const { t } = useTranslation();

  return (
    <div className="A_about_container">
      <header className="A_about_header">
        <h1 className="A_about_title">{t('about_title')}</h1>
        <div className="A_title_underline"></div>
      </header>

      <div className="A_about_grid">
        {/* Missiya bo'limi */}
        <section className="A_about_card A_mission_section">
          <h2 className="A_card_title">
            <span className="A_icon">🎯</span> {t('about_mission')}
          </h2>
          <p className="A_card_text">
            {t('about_mission_desc')}
          </p>
        </section>

        {/* Qoidalar bo'limi */}
        <section className="A_about_card A_rules_section">
          <h2 className="A_card_title">
            <span className="A_icon">📜</span> {t('about_rules_title')}
          </h2>
          <ul className="A_rules_list">
            <li><span className="A_rule_num">01.</span> {t('rule_1')}</li>
            <li><span className="A_rule_num">02.</span> {t('rule_2')}</li>
            <li><span className="A_rule_num">03.</span> {t('rule_3')}</li>
          </ul>
        </section>

        {/* Ma'lumotlar bo'limi */}
        <section className="A_about_card A_info_section">
          <div className="A_info_item">
            <span className="A_info_label">{t('about_dev')}:</span>
            <span className="A_info_value">SECRET AGENT</span>
          </div>
          <div className="A_info_item">
            <span className="A_info_label">{t('system_online')}:</span>
            <span className="A_status_dot"></span>
          </div>
          <div className="A_version_tag">
            {t('system_version')}
          </div>
        </section>
      </div>

      <footer className="A_about_footer">
        <p>© 2026 MAFIA CREATIVE GAME. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
};

export default About;