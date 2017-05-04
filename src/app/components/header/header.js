import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { Link } from "react-router-dom";

const Header = (props) => {
  "use strict";
  return (
    <nav className="navbar navbar-toggleable-md navbar-light bg-faded">
      <div className="container">
        <button className="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon" />
        </button>
        <Link className="navbar-brand" to="/">Logo</Link>

        <div className="collapse navbar-collapse">
        <ul className="navbar-nav mr-auto">
          <li className={classNames("nav-item", {active: props.url === "/"})}>
            <Link className="nav-link" to="/">Home <span className="sr-only">(current)</span></Link>
          </li>
          <li className={classNames("nav-item", {active: props.url === "/about"})}>
            <Link className="nav-link" to="/about">About</Link>
          </li>
          <li className={classNames("nav-item", {active: props.url === "/blog"})}>
            <Link className="nav-link" to="/blog">Blog</Link>
          </li>
          <li className={classNames("nav-item", {active: props.url === "/contact"})}>
            <Link className="nav-link" to="/contact">Contact</Link>
          </li>
        </ul>
      </div>
      </div>
    </nav>
  );
};
Header.propTypes = {
  url: PropTypes.string.isRequired
};

export default Header;