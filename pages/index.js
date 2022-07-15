import Head from 'next/head'
import React, { useState, useEffect } from 'react';
import $ from 'jquery';

function getJQueryFrame(){
  return $("#jackbox");
}

function getJQueryFrameContent(){
  return getJQueryFrame().contents();
}

function getFrame(){
  return getJQueryFrame().get(0);
}

function getDocument(){
  return getFrame().contentDocument;
}

function inGame(){
  return (getJQueryFrameContent().find(".app-root").length > 0 ? true : false);
}

function getGame(){
  if (getJQueryFrameContent().find(".jackbox-talks").length > 0){
    console.log("jack");
    return "jackbox-talks";
  }
  return null
}

function addModSettingsButton(){
  if (getJQueryFrameContent().find("fieldset").length !== 0 && getJQueryFrameContent().find("#button-settings").length == 0){
    const settingsButton = $(document.createElement("button"));
    settingsButton.text("MOD SETTINGS");
    settingsButton.attr("data-v-2ba6adc4", "");
    settingsButton.attr("id", "button-settings");
    settingsButton.on("click", () => {
      window.location.href = "/settings/";
    });
    getJQueryFrameContent().find("fieldset").append(settingsButton);
  }
}

async function editJackboxTalks(){
  console.log("edit");
  if(getJQueryFrameContent().find("#jackbox-talks-custom-images").length == 0){
    const css = $(document.createElement("link"))
    css.attr({
      type: 'text/css',
      rel: 'stylesheet',
      href: '/jackbox/customimages/7/jackbox-talks/css'
    })
    css.attr("id", "jackbox-talks-custom-images")
    getJQueryFrameContent().find("head").append(css);
  }
}

function editHome(){
  addModSettingsButton();
}

function editJackbox(){
  if(inGame()){
    console.log("here");
    if(getGame() == "jackbox-talks"){
      console.log("here");
      editJackboxTalks();
    }
  } else {
    editHome();
  }
}

function watchJackboxContent(){
  const targetNode = getDocument();

  const config = { attributes: true, childList: true, subtree: true };

  const callback = function (mutationList, observer) {
    editJackbox();
    for (const mutation of mutationList) {
      if (mutation.type === 'childList') {
        console.log('A child node has been added or removed.');
      }
      else if (mutation.type === 'attributes') {
        console.log('The ' + mutation.attributeName + ' attribute was modified.');
      }
    }
  };

  const observer = new MutationObserver(callback);

  observer.observe(targetNode, config);
}

export default function Home() {

  useEffect(() => {
    const targetNode = getDocument();

    const config = { attributes: true, childList: true, subtree: true };

    const callback = function (mutationList, observer) {
      editJackbox();
      for (const mutation of mutationList) {
        if (mutation.type === 'childList') {
          console.log('A child node has been added or removed.');
        }
        else if (mutation.type === 'attributes') {
          console.log('The ' + mutation.attributeName + ' attribute was modified.');
        }
      }
    };

    const observer = new MutationObserver(callback);

    observer.observe(targetNode, config);
  }, []);

  return (
    <>
      <Head>
        <title>Custom Jackbox</title>
        <meta name="description" content="Custom Jackbox Games Server" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <iframe id="jackbox" src="/jackbox/" allow="camera;microphone" className="fixed inset-0 w-full h-full"/>
    </>
  )
}
