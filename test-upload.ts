import fetch from 'node-fetch'; // Or native fetch if available
import FormData from 'form-data';
import * as fs from 'fs';

async function uploadToFreeImageHost(base64Image: string) {
    const apiKey = '6d207e02198a847aa98d0a2a901485a5';
    const form = new FormData();
    form.append('key', apiKey);
    form.append('action', 'upload');
    form.append('source', base64Image);
    form.append('format', 'json');

    const res = await fetch('https://freeimage.host/api/1/upload', {
        method: 'POST',
        body: form
    });

    const data = await res.json();
    console.log(data);
}

// Just a tiny 1x1 pixel base64 for testing
const testBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
uploadToFreeImageHost(testBase64).catch(console.error);
