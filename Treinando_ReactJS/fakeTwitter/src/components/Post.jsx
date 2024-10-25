import { formatDistance, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import styles from './Post.module.css'

export default function Post({post}) {
    const publishedToNow = formatDistanceToNow(new Date(post.date), {
            locale: ptBR,
            addSuffix: true,
        })

    return (
        <div className={styles.postContainer}>
            <img className={styles.fotoPerfil} src={post.user.picture} />

            <div className={styles.postHeader}>
                <div className={styles.user}>
                    <span className={styles.userName}>{post.user.name}</span>
                    <span className={styles.userUserName}>{post.user.username}</span>
                </div>
                <button className={styles.botaoTresPontinhos}><img src="https://img.icons8.com/?size=100&id=102729&format=png&color=000000" className={styles.tresPontinhos} /></button>
                <div className={styles.buttonExcluir}><h6>Excluir</h6></div>
            </div>

            <div className={styles.postText}>
                {post.text}
            </div>

            <div className={styles.postData}>
                <span className={styles.date}>{publishedToNow}</span>
            </div>

            <div className={styles.parteInterativa}>
                <img src="https://img.icons8.com/?size=100&id=87&format=png&color=000000" />
                <img src="https://img.icons8.com/?size=100&id=143&format=png&color=000000" />
                <img src="https://img.icons8.com/?size=100&id=GaN6OXnQ6Cxm&format=png&color=000000" />
            </div>
        </div>
    )
}