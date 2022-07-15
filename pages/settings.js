import { Button, Card, Center, Input, InputWrapper, SimpleGrid, Stack, Title } from '@mantine/core'
import Head from 'next/head'
import React, { useState, useEffect } from 'react';
import $ from 'jquery';

export async function getServerSideProps() {
    // Fetch data from external API
    const res = await fetch("http://localhost:3434/mod/config");
    const config = await res.json()

    // Pass data to the page via props
    return { props: { config } }
}

export default function Settings( { config } ) {

    useEffect(() => {
        $("#games-directory").val(config.gamesDirectory);
        $("#images-directory").val(config.imagesDirectory);
        $(".directory").on("input", async (e) => {
            e.stopImmediatePropagation();
            await fetch("/mod/config/update", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gamesDirectory: $("#games-directory").val(),
                    imagesDirectory: $("#images-directory").val()
                })
            });
        })
        $("#mod-button").on("click", async (e) => {
            e.stopImmediatePropagation();
            $("#mod-button").attr("disabled", "");
            $("#mod-button").attr("loading", "");
            $("#mod-button").text("Modding...");
            await fetch("/mod/enable", {
                method: "POST"
            });
            $("#mod-button").removeAttr("disabled");
            $("#mod-button").removeAttr("loading");
            $("#mod-button").text("Mod Game");
        });
        $("#restore-button").on("click", async (e) => {
            e.stopImmediatePropagation();
            $("#restore-button").attr("disabled", "");
            $("#restore-button").attr("loading", "");
            $("#restore-button").text("Restoring...");
            await fetch("/mod/disable", {
                method: "POST"
            });
            $("#restore-button").removeAttr("disabled");
            $("#restore-button").removeAttr("loading");
            $("#restore-button").text("Restore Game");
        });
    }, []);

    return (
        <>
            <Head>
                <title>Custom Jackbox - Settings</title>
                <meta name="description" content="Custom Jackbox Games Server" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <Center className="fixed inset-0 w-full h-full bg-jackbox">
                <Card className="w-4/5 h-4/5">
                    <SimpleGrid cols={2} breakpoints={[
                        { maxWidth: 755, cols: 2 },
                        { maxWidth: 600, cols: 1 },
                    ]} className="w-full h-full">
                        <Center>
                            <Stack>
                                <InputWrapper
                                    required
                                    id="games-directory"
                                    label="Games Directory"
                                    description="The full path to where all Jackbox Party Packs are stored"
                                    size="xl"
                                >
                                    <Input
                                        id="games-directory"
                                        className="directory"
                                        placeholder="Jackbox Games Directory"
                                    />
                                </InputWrapper>
                                <InputWrapper
                                    required
                                    id="images-directory"
                                    label="Images Directory"
                                    description="The full path to where all custom images are stored for all Jackbox Party Packs"
                                    size="xl"
                                >
                                    <Input
                                        id="images-directory"
                                        className="directory"
                                        placeholder="Jackbox Images Directory"
                                    />
                                </InputWrapper>
                            </Stack>
                        </Center>
                        <Center>
                            <Stack>
                                <Button id="mod-button" size="xl" className="bg-jackbox">Mod Game</Button>
                                <Button id="restore-button" size="xl" className="bg-jackbox">Restore Game</Button>
                                <Button component="a" href="/" size="xl" className="bg-jackbox">Back To Jackbox</Button>
                            </Stack>
                        </Center>
                    </SimpleGrid>
                </Card>
            </Center>
        </>
    )
}
