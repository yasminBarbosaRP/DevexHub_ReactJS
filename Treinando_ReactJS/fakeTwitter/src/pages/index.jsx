import TextInput from "../components/TextInput";
import Post from '../components/Post';
import styles from '../pages/index.module.css';
import { useIndex } from '../hooks/useIndex.page';

export default function Index() {
    const {
        text,
        onTextChange,
        maxLength,
        sendPost,
        postList
    } = useIndex();

    return (
        <div className='centralizarPagina'>
            <h1>Twix</h1>
            <hr />
            <div className='postBox'>
                <img src="/src/imagens/fotoPerfil.jpg" alt="" />
                <TextInput 
                placeholder={"What's new?"}
                maxLength={maxLength}
                value={text}
                onChange={onTextChange}
                />
            </div>
            <div className='footPost'>
                <div>{text.length} / {maxLength}</div>
                <button onClick={sendPost} disabled={text.length === 0} className={styles.botaoSend}>Send Post</button>
            </div>

            <ul className='listaPosts'>
                {postList.slice().reverse().map(post => {
                    return (
                        <li className={styles.postListItem}>
                            <Post post={post} />
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}