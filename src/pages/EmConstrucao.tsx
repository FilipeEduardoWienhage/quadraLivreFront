interface Props {
  titulo: string
}

export default function EmConstrucao({ titulo }: Props) {
  return (
    <>
      <h1>{titulo}</h1>
      <p>Em construção.</p>
    </>
  )
}
