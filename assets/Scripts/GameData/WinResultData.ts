import { SymbolType } from './SymbolType';
import { WinMatchCount } from './WinRule';

// 保存單條 Payline 的中獎 Symbol、連線數量與盤面位置
export interface IWinResultData
{
    SymbolType: SymbolType;
    MatchCount: WinMatchCount;
    WinningPositions: { ReelIndex: number, RowIndex: number }[];
}
