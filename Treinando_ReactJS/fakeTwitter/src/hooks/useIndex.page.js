import { useState } from 'react';

export function useIndex() {
    const [text, setText] = useState('');
    const [postList, setPostList] = useState([])
    const maxLength = 200;

    const post = {
        date: new Date(),
        text: text,
        user: {
        name: 'Yasmin Barbosa',
        username: '@yass_linda',
        picture: "/src/imagens/fotoPerfil.jpg"
        }
    }

    function onTextChange(event) {
        const text = event.target.value;
        if (text.length <= maxLength) {
            setText(text);
        }
    }    

    function sendPost(event) {
        setPostList([...postList, post]);
    }

    return {
        text,
        onTextChange,
        maxLength,
        sendPost,
        postList
    }
}