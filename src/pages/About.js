import React from 'react';
import { Helmet } from 'react-helmet'; // For <head> modifications

const About = () => {
  return (
    <>
    <Helmet>
        <title>About</title>
    </Helmet>

    <div>
      <h1>About Us</h1>
      <p>This is the About page of the site.</p>
    </div>
    </>
  );
};

export default About;
