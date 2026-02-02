import argparse
import sqlite3
from pathlib import Path


def clear_month(db_path: Path, mes: int, ano: int) -> None:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    folha_ids = [row[0] for row in cur.execute(
        'SELECT id FROM folhas_pagamento WHERE mes = ? AND ano = ?',
        (mes, ano)
    )]
    print(f'Folhas alvo ({mes}/{ano}):', folha_ids)

    if folha_ids:
        placeholders = ','.join('?' * len(folha_ids))
        deleted = cur.execute(
            f'DELETE FROM folha_subsidios_detalhes WHERE folha_id IN ({placeholders})',
            folha_ids
        )
        print('Detalhes removidos:', deleted.rowcount)

    deleted_folhas = cur.execute(
        'DELETE FROM folhas_pagamento WHERE mes = ? AND ano = ?',
        (mes, ano)
    )
    print('Folhas removidas:', deleted_folhas.rowcount)

    deleted_status = cur.execute(
        'DELETE FROM folha_pagamentos_status WHERE mes = ? AND ano = ?',
        (mes, ano)
    )
    print('Status removidos:', deleted_status.rowcount)

    conn.commit()
    conn.close()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', required=True, help='Caminho para sgva.db')
    parser.add_argument('--mes', type=int, required=True)
    parser.add_argument('--ano', type=int, required=True)
    args = parser.parse_args()

    clear_month(Path(args.db), args.mes, args.ano)


if __name__ == '__main__':
    main()
